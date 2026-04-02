import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, _context: { params: { page: string } }) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Public content route contract is not implemented yet.'
      }
    },
    { status: 501 }
  );
}
