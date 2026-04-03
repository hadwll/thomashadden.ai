import { NextResponse } from 'next/server';
import { createOrGetReadinessSession, READINESS_TOTAL_QUESTIONS } from '@/lib/readiness/session-store';

type ErrorCode = 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

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

function ok(sessionToken: string, status: 'in_progress' | 'abandoned') {
  return NextResponse.json(
    {
      success: true,
      data: {
        sessionToken,
        status,
        totalQuestions: READINESS_TOTAL_QUESTIONS
      },
      meta: createMeta()
    },
    { status: 200 }
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'body',
        reason: 'Malformed JSON body.'
      });
    }

    if (!isObjectRecord(payload)) {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'body',
        reason: 'Body must be a JSON object.'
      });
    }

    if (typeof payload.sessionToken !== 'string' || !UUID_REGEX.test(payload.sessionToken)) {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'sessionToken',
        reason: 'sessionToken must be a valid UUID.'
      });
    }

    const session = createOrGetReadinessSession(payload.sessionToken);

    return ok(session.sessionToken, session.status);
  } catch {
    return error(500, 'INTERNAL_ERROR', 'An internal error occurred while creating the readiness session.');
  }
}
