import { NextRequest, NextResponse } from 'next/server';
import { classifyLLMQuery } from '@/lib/llm/classifier';
import { isLLMQuerySource, validateLLMQuery } from '@/lib/llm/query';
import * as llmServer from '@/lib/llm/server';
import type { LLMQueryRequest, LLMQuerySource } from '@/lib/llm/types';

type ErrorCode = 'VALIDATION_ERROR' | 'LLM_ERROR';

type ParsedPayload = {
  query: string;
  stream: boolean;
  sessionId?: string;
  context?: {
    source?: LLMQuerySource;
  };
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function createQueryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `qry_${crypto.randomUUID()}`;
  }

  return `qry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

function thomasProfileFallbackResponse() {
  return {
    answer:
      "Thomas is focused on applied AI, automation, and measurable industrial outcomes. For specific examples, the Projects and Research pages are the best next places to explore.",
    queryType: 'thomas_profile',
    sources: [],
    suggestedActions: [],
    queryId: createQueryId()
  };
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

function parseLLMQueryRequest(body: unknown): ParsedPayload | { error: NextResponse } {
  if (!isObjectRecord(body)) {
    return {
      error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'body',
        reason: 'Body must be a JSON object.'
      })
    };
  }

  if (typeof body.query !== 'string') {
    return {
      error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'query',
        reason: 'Query is required and must be a string.'
      })
    };
  }

  const query = body.query.trim();
  const queryValidation = validateLLMQuery(query);
  if (!queryValidation.ok) {
    return {
      error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'query',
        reason: queryValidation.reason
      })
    };
  }

  if (body.stream !== undefined && typeof body.stream !== 'boolean') {
    return {
      error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'stream',
        reason: 'stream must be a boolean when provided.'
      })
    };
  }

  if (body.sessionId !== undefined) {
    if (typeof body.sessionId !== 'string' || !UUID_REGEX.test(body.sessionId)) {
      return {
        error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
          field: 'sessionId',
          reason: 'sessionId must be a valid UUID when provided.'
        })
      };
    }
  }

  let source: LLMQuerySource | undefined;
  if (body.context !== undefined) {
    if (!isObjectRecord(body.context)) {
      return {
        error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
          field: 'context',
          reason: 'context must be an object when provided.'
        })
      };
    }

    if (body.context.source !== undefined) {
      if (typeof body.context.source !== 'string' || !isLLMQuerySource(body.context.source)) {
        return {
          error: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
            field: 'context.source',
            reason: 'context.source is not a supported value.'
          })
        };
      }

      source = body.context.source;
    }
  }

  const parsed: ParsedPayload = {
    query,
    stream: body.stream ?? false
  };

  if (body.sessionId !== undefined) {
    parsed.sessionId = body.sessionId;
  }

  if (source !== undefined) {
    parsed.context = { source };
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
      field: 'body',
      reason: 'Malformed JSON body.'
    });
  }

  const parsed = parseLLMQueryRequest(payload);
  if ('error' in parsed) {
    return parsed.error;
  }

  const normalizedRequest: LLMQueryRequest = {
    query: parsed.query,
    stream: parsed.stream,
    ...(parsed.sessionId ? { sessionId: parsed.sessionId } : {}),
    ...(parsed.context ? { context: parsed.context } : {})
  };

  try {
    if (normalizedRequest.stream === true) {
      const stream = await llmServer.streamLLMQuery(normalizedRequest);

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        }
      });
    }

    const data = await llmServer.executeLLMQuery(normalizedRequest);
    return ok(data);
  } catch {
    try {
      const category = await classifyLLMQuery(normalizedRequest.query);
      if (category === 'thomas_profile' && normalizedRequest.stream !== true) {
        return ok(thomasProfileFallbackResponse());
      }
    } catch {
      // Ignore classifier fallback failures and return the standard error envelope.
    }

    return error(500, 'LLM_ERROR', "I'm having a moment - please try again in a few seconds.");
  }
}
