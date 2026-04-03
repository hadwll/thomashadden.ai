import { NextRequest, NextResponse } from 'next/server';
import { runManualRAGIngest } from '@/lib/rag/ingest';

type ErrorCode = 'VALIDATION_ERROR' | 'RAG_ERROR';

type ParsedPayload = {
  forceReingest?: boolean;
};

const LEAK_PATTERNS = [
  /\bstack\b/i,
  /process\.env/i,
  /\/home\//i,
  /[A-Za-z]:\\/,
  /\bat\s+\S+\.(ts|js):\d+/i
];

function hasLeakPattern(text: string): boolean {
  return LEAK_PATTERNS.some((pattern) => pattern.test(text));
}

function sanitizeText(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0 || hasLeakPattern(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function sanitizeSummary(summary: Awaited<ReturnType<typeof runManualRAGIngest>>) {
  return {
    ...summary,
    errors: summary.errors.map((entry) => {
      const nextMessage = sanitizeText(entry.message, 'Ingest step failed.');
      const nextSourceFile =
        entry.sourceFile && !hasLeakPattern(entry.sourceFile) ? entry.sourceFile.trim() || undefined : undefined;

      return {
        ...(nextSourceFile ? { sourceFile: nextSourceFile } : {}),
        message: nextMessage
      };
    })
  };
}

function createMeta() {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    requestId,
    timestamp: new Date().toISOString()
  };
}

function ok(data: unknown) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: createMeta()
    },
    { status: 200 }
  );
}

function error(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      },
      meta: createMeta()
    },
    { status }
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseBody(request: NextRequest): Promise<ParsedPayload | { error: NextResponse }> {
  const rawBody = await request.text();
  if (rawBody.trim().length === 0) {
    return {};
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return {
      error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'body',
        reason: 'Malformed JSON body.'
      })
    };
  }

  if (!isObjectRecord(body)) {
    return {
      error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'body',
        reason: 'Body must be a JSON object.'
      })
    };
  }

  if (body.forceReingest !== undefined && typeof body.forceReingest !== 'boolean') {
    return {
      error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'forceReingest',
        reason: 'forceReingest must be a boolean when provided.'
      })
    };
  }

  return {
    ...(body.forceReingest !== undefined ? { forceReingest: body.forceReingest } : {})
  };
}

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request);
  if ('error' in parsed) {
    return parsed.error;
  }

  try {
    const summary = await runManualRAGIngest(
      parsed.forceReingest !== undefined ? { forceReingest: parsed.forceReingest } : undefined
    );
    return ok(sanitizeSummary(summary));
  } catch {
    return error(500, 'RAG_ERROR', 'RAG ingest pipeline failed.');
  }
}
