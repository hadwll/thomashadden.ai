import { NextResponse } from 'next/server';
import {
  getReadinessSession,
  isReadinessSessionStale,
  markReadinessSessionAbandoned,
  READINESS_TOTAL_QUESTIONS
} from '@/lib/readiness/session-store';

type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';

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

function ok(session: {
  sessionToken: string;
  status: 'in_progress' | 'abandoned';
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: typeof READINESS_TOTAL_QUESTIONS;
}) {
  return NextResponse.json(
    {
      success: true,
      data: {
        sessionToken: session.sessionToken,
        status: session.status,
        answeredQuestions: [...session.answeredQuestions],
        nextQuestionIndex: session.nextQuestionIndex,
        totalQuestions: session.totalQuestions
      },
      meta: createMeta()
    },
    { status: 200 }
  );
}

type RouteContext = {
  params: {
    token: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const token = context.params.token;
    if (typeof token !== 'string' || !UUID_REGEX.test(token)) {
      return error(422, 'VALIDATION_ERROR', 'Path token failed validation.', {
        field: 'token',
        reason: 'token must be a valid UUID.'
      });
    }

    const session = getReadinessSession(token);
    if (!session) {
      return error(404, 'NOT_FOUND', 'Requested readiness session was not found.');
    }

    const nextSession = isReadinessSessionStale(session) ? markReadinessSessionAbandoned(token) ?? session : session;

    return ok(nextSession);
  } catch {
    return error(500, 'INTERNAL_ERROR', 'An internal error occurred while loading the readiness session.');
  }
}
