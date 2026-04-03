import { NextResponse } from 'next/server';

const SAFE_NEXT_PATH = '/';
const AUTH_FAILURE_TARGET = '/readiness?error=auth_failed';

function validateNextPath(nextParam: string | null): string {
  if (typeof nextParam !== 'string') {
    return SAFE_NEXT_PATH;
  }

  return /^\/[a-z]/.test(nextParam) ? nextParam : SAFE_NEXT_PATH;
}

function redirectTo(url: string, status = 302) {
  return NextResponse.redirect(url, { status });
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = validateNextPath(searchParams.get('next'));
  const code = searchParams.get('code');
  const authError = searchParams.get('error') ?? searchParams.get('error_code');

  if (authError) {
    return redirectTo(`${origin}${AUTH_FAILURE_TARGET}`);
  }

  if (!code) {
    return redirectTo(`${origin}${AUTH_FAILURE_TARGET}`);
  }

  return redirectTo(`${origin}${next}`);
}
