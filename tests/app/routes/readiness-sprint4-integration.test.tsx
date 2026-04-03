import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContactPage from '@/app/contact/page';
import ReadinessPage from '@/app/readiness/page';
import ReadinessResultPage from '@/app/readiness/result/page';
import { READINESS_QUESTION_SET } from '@/lib/readiness/question-set';

const ORIGINAL_FETCH = global.fetch;
const RESUMABLE_SESSION_TOKEN = '88888888-8888-4888-8888-888888888888';
const RESULT_SESSION_TOKEN = '55555555-5555-4555-8555-555555555555';
const AUTH_NAME = 'Jane Reviewer';
const AUTH_EMAIL = 'jane@example.com';

const navigationMocks = vi.hoisted(() => ({
  backMock: vi.fn(),
  forwardMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  replaceMock: vi.fn()
}));

const supabaseMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: navigationMocks.backMock,
    forward: navigationMocks.forwardMock,
    push: navigationMocks.pushMock,
    refresh: navigationMocks.refreshMock,
    replace: navigationMocks.replaceMock
  })
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: supabaseMocks.getSessionMock
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

function installReadinessFetchMock() {
  const requestLog: Array<{ method: string; url: string; body?: Record<string, unknown> }> = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');

    if (url.endsWith('/api/readiness-check/questions') && method === 'GET') {
      requestLog.push({ method, url });
      return jsonResponse({
        success: true,
        data: READINESS_QUESTION_SET
      });
    }

    if (url.endsWith('/api/readiness-check/session') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as { sessionToken?: string };
      requestLog.push({ method, url, body: requestBody });

      return jsonResponse({
        success: true,
        data: {
          sessionToken: requestBody.sessionToken ?? RESUMABLE_SESSION_TOKEN,
          status: 'in_progress',
          totalQuestions: READINESS_QUESTION_SET.totalQuestions
        }
      });
    }

    if (url.includes('/api/readiness-check/session/') && method === 'GET') {
      const token = url.split('/').pop() ?? RESUMABLE_SESSION_TOKEN;
      requestLog.push({ method, url });

      return jsonResponse({
        success: true,
        data: {
          sessionToken: token,
          status: 'in_progress',
          answeredQuestions: [0, 1, 2],
          nextQuestionIndex: 3,
          totalQuestions: READINESS_QUESTION_SET.totalQuestions
        }
      });
    }

    if (url.endsWith('/api/readiness-check/answer') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as {
        sessionToken?: string;
        questionId?: string;
        optionId?: string;
      };
      requestLog.push({ method, url, body: requestBody });

      return jsonResponse({
        success: true,
        data: {
          answeredCount: 4,
          isComplete: false
        }
      });
    }

    if (url.endsWith('/api/readiness-check/link-session') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as { sessionToken?: string };
      requestLog.push({ method, url, body: requestBody });

      return jsonResponse({
        success: true,
        data: {
          linked: true
        }
      });
    }

    if (url.includes('/api/readiness-check/result/') && method === 'GET') {
      requestLog.push({ method, url });

      return jsonResponse({
        success: true,
        data: {
          resultId: `result_${RESULT_SESSION_TOKEN}`,
          category: 'early_stage',
          categoryLabel: 'Early-Stage',
          score: 18,
          summary:
            "Your business is at the beginning of the AI journey - and that's completely normal. The good news is that starting with a clear picture of where you are is exactly the right first move.",
          nextStep:
            'A short conversation about your business and the areas where you are feeling the most pressure is the best place to start.',
          cta: {
            label: 'Start with a conversation — get in touch',
            url: '/contact?source=readiness_check&result=early_stage'
          }
        }
      });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return {
    fetchMock,
    requestLog
  };
}

function mockAuthenticatedSession() {
  supabaseMocks.getSessionMock.mockResolvedValue({
    data: {
      session: {
        access_token: 'supabase-access-token-mock',
        user: {
          id: 'user_123',
          email: AUTH_EMAIL
        }
      }
    },
    error: null
  });
}

function resetBrowserState(pathname = '/') {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, '', pathname);
}

describe('Sprint 4 route integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = ORIGINAL_FETCH;
    resetBrowserState();
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = ORIGINAL_FETCH;
    resetBrowserState();
  });

  it('renders /readiness on the resume path and keeps the shell chrome hidden', async () => {
    installReadinessFetchMock();
    window.localStorage.setItem('readiness_session_token', RESUMABLE_SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessPage />);

    await screen.findByText(READINESS_QUESTION_SET.questions[3].text);

    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
    expect(screen.getByText(/question 4 of 7/i)).toBeVisible();
  });

  it('renders /readiness/result as the protected result surface instead of a placeholder', async () => {
    mockAuthenticatedSession();
    installReadinessFetchMock();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);
    window.history.replaceState({}, '', '/readiness/result');

    render(<ReadinessResultPage />);

    expect(screen.getByText(/loading your results/i)).toBeVisible();

    await screen.findByText('Early-Stage');

    expect(screen.getByText('18')).toBeVisible();
    expect(screen.getByRole('link', { name: /start with a conversation/i })).toHaveAttribute(
      'href',
      '/contact?source=readiness_check&result=early_stage'
    );
    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });

  it('accepts readiness-originated contact context and keeps the handoff state available to the route shell', async () => {
    mockAuthenticatedSession();
    window.history.replaceState({}, '', '/contact?source=readiness_check&result=early_stage');

    render(await ContactPage());

    const form = screen.getByTestId('contact-form-shell');
    expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();
    expect(form).toBeVisible();
    expect(within(form).getByLabelText('Name')).toBeVisible();
    expect(within(form).getByLabelText('Email')).toBeVisible();
    expect(within(form).getByLabelText('Subject')).toHaveValue('AI Readiness follow-up');
    expect(within(form).getByLabelText('Enquiry type')).toHaveValue('business_enquiry');
    expect(form.querySelector('input[name="source"]') as HTMLInputElement | null).toHaveValue('readiness_check');
    expect(new URL(window.location.href).searchParams.get('source')).toBe('readiness_check');
    expect(new URL(window.location.href).searchParams.get('result')).toBe('early_stage');
  });
});
