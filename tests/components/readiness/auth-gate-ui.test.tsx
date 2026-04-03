import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGate } from '@/components/readiness/AuthGate';
import { ReadinessCheck } from '@/components/readiness/ReadinessCheck';
import { READINESS_QUESTION_SET } from '@/lib/readiness/question-set';
import { createClient } from '@/lib/supabase/client';

const ORIGINAL_FETCH = global.fetch;
const COMPLETED_SESSION_TOKEN = '44444444-4444-4444-8444-444444444444';
const READINESS_REDIRECT_TO = `${window.location.origin}/auth/callback?next=/readiness/result`;

const authMocks = vi.hoisted(() => ({
  signInWithOAuthMock: vi.fn(),
  signInWithOtpMock: vi.fn()
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: authMocks.signInWithOAuthMock,
      signInWithOtp: authMocks.signInWithOtpMock
    }
  }))
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

function createCompletedReadinessSession() {
  return {
    success: true,
    data: {
      sessionToken: COMPLETED_SESSION_TOKEN,
      status: 'completed' as const,
      answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
      nextQuestionIndex: 7,
      totalQuestions: 7
    }
  };
}

function installCompletedReadinessFetchMock() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');

    if (url.endsWith('/api/readiness-check/questions') && method === 'GET') {
      return jsonResponse({
        success: true,
        data: READINESS_QUESTION_SET
      });
    }

    if (url.includes('/api/readiness-check/session/') && method === 'GET') {
      return jsonResponse(createCompletedReadinessSession());
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return fetchMock;
}

function resetReadinessSessionStorage() {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/');
}

describe('readiness auth gate UI contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = ORIGINAL_FETCH;
    resetReadinessSessionStorage();
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = ORIGINAL_FETCH;
    resetReadinessSessionStorage();
  });

  it('replaces the generic completion card with the auth gate after the final readiness answer', async () => {
    const user = userEvent.setup();
    installCompletedReadinessFetchMock();

    window.localStorage.setItem('readiness_session_token', COMPLETED_SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T12:00:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[6].text);
    await user.click(screen.getByRole('button', { name: /see my results/i }));

    expect(screen.getByText(/sign in to see your results/i)).toBeVisible();
    expect(screen.getByText(/assessment is ready/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /continue with linkedin/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /continue with email/i })).toBeVisible();
    expect(screen.queryByText(/your results are ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/your score will appear after the auth step/i)).not.toBeInTheDocument();
  });

  it('exposes LinkedIn and Email actions that are wired to the browser auth helper contract', async () => {
    const user = userEvent.setup();
    const onLinkedIn = vi.fn(async () => {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: READINESS_REDIRECT_TO,
          scopes: 'openid profile email'
        }
      });
    });
    const onEmail = vi.fn(async (email: string) => {
      const supabase = createClient();
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: READINESS_REDIRECT_TO
        }
      });
    });

    render(
      <AuthGate
        onLinkedIn={onLinkedIn}
        onEmail={onEmail}
        isSubmitting={false}
        errorMessage={null}
      />
    );

    expect(screen.getByText(/sign in to see your results/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /continue with linkedin/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /continue with email/i })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /continue with linkedin/i }));

    expect(onLinkedIn).toHaveBeenCalledTimes(1);
    expect(authMocks.signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: READINESS_REDIRECT_TO,
        scopes: 'openid profile email'
      }
    });
    expect(authMocks.signInWithOtpMock).not.toHaveBeenCalled();
  });

  it('shows email validation, keeps the gate retryable after failure, and stays on the gate after dismissal', async () => {
    const user = userEvent.setup();
    const onEmail = vi.fn(async (email: string) => {
      const supabase = createClient();
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: READINESS_REDIRECT_TO
        }
      });
    });

    render(
      <AuthGate
        onLinkedIn={vi.fn()}
        onEmail={onEmail}
        isSubmitting={false}
        errorMessage={null}
      />
    );

    await user.click(screen.getByRole('button', { name: /continue with email/i }));
    const emailInput = screen.getByRole('textbox', { name: /email address/i });
    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/enter a valid email/i);
    expect(authMocks.signInWithOtpMock).not.toHaveBeenCalled();

    expect(screen.getByRole('button', { name: /continue with linkedin/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /continue with email/i })).toBeEnabled();
    expect(screen.getByText(/sign in to see your results/i)).toBeVisible();
  });

  it('clears the gate for a mocked authenticated callback state and prepares the protected result handoff', async () => {
    render(
      <AuthGate
        onLinkedIn={vi.fn()}
        onEmail={vi.fn()}
        isSubmitting={false}
        errorMessage={null}
        isAuthenticatedSession
      />
    );

    expect(screen.queryByText(/sign in to see your results/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue with linkedin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue with email/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('readiness-result-handoff')).toBeVisible();
  });
});
