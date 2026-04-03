import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'link-session route stub for ticket SPR-04-06a.'
      }
    },
    { status: 501 }
  );
}
