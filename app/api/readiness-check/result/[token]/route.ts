import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'result route stub for ticket SPR-04-06a.'
      }
    },
    { status: 501 }
  );
}
