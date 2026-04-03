import { NextResponse } from 'next/server';
import { READINESS_QUESTION_SET } from '@/lib/readiness/question-set';

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

function ok() {
  return NextResponse.json(
    {
      success: true,
      data: READINESS_QUESTION_SET,
      meta: createMeta()
    },
    { status: 200 }
  );
}

function error(message: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message
      },
      meta: createMeta()
    },
    { status: 500 }
  );
}

export async function GET(_request: Request) {
  try {
    return ok();
  } catch {
    return error('Unable to load readiness questions.');
  }
}
