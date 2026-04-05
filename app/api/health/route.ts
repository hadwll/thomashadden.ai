import { NextResponse } from 'next/server';
import { createHealthCheckEnvelope } from './health-check';

function createMeta() {
  return {
    requestId: 'stub',
    timestamp: new Date().toISOString()
  };
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Health route stub.',
        details: createHealthCheckEnvelope()
      },
      meta: createMeta()
    },
    { status: 500 }
  );
}
