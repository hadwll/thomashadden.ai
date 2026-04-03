import { NextResponse } from 'next/server';
import { getReadinessSession, type ReadinessSessionRecord } from '@/lib/readiness/session-store';
import { createClient } from '@/lib/supabase/server';

type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHORISED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';

type ReadinessSessionWithLink = ReadinessSessionRecord & {
  user_id?: string | null;
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

function ok() {
  return NextResponse.json(
    {
      success: true,
      data: {
        linked: true
      },
      meta: createMeta()
    },
    { status: 200 }
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const supabase = createClient(request);
  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    return null;
  }

  const userId = data.session?.user?.id;
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return null;
  }

  return userId;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return error(401, 'UNAUTHORISED', 'You need to sign in to link your readiness result.');
    }

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

    const session = (await getReadinessSession(payload.sessionToken)) as ReadinessSessionWithLink | null;
    if (!session || session.status !== 'completed') {
      return error(404, 'NOT_FOUND', 'Requested readiness session was not found.');
    }

    const linkedUserId = typeof session.user_id === 'string' && session.user_id.trim().length > 0 ? session.user_id : null;
    if (linkedUserId && linkedUserId !== userId) {
      return error(403, 'FORBIDDEN', 'This assessment is linked to a different account.');
    }

    if (!linkedUserId) {
      session.user_id = userId;
    }

    return ok();
  } catch {
    return error(500, 'INTERNAL_ERROR', 'An internal error occurred while linking the readiness session.');
  }
}
