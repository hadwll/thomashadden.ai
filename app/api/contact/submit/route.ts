import { NextResponse } from 'next/server';

// TODO: Sprint 5 WP-05.2 stub for the contact submit implementation ticket.
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Contact submit route stub.'
      },
      meta: {
        requestId: 'stub',
        timestamp: new Date().toISOString()
      }
    },
    { status: 500 }
  );
}
