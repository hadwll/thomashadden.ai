import { NextResponse } from 'next/server';
import { createHealthCheckEnvelope } from './health-check';

type ErrorCode = 'SERVICE_UNAVAILABLE';

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

function success(data: unknown) {
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

export async function GET() {
  const health = createHealthCheckEnvelope();

  if (health.status === 'ok') {
    return success({
      status: 'ok',
      serviceStatus: health.serviceStatus
    });
  }

  return error(503, 'SERVICE_UNAVAILABLE', 'Health check failed. Launch-critical services are not fully configured.', {
    status: 'degraded',
    missing: health.missing,
    serviceStatus: health.serviceStatus
  });
}
