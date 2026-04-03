import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReadinessResultPage from '@/app/readiness/result/page';
import { createClient } from '@/lib/supabase/client';

const ORIGINAL_FETCH = global.fetch;
const RESULT_SESSION_TOKEN = '55555555-5555-4555-8555-555555555555';
const RESULT_ACCESS_TOKEN = 'supabase-access-token-mock';

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

type ReadinessResultFixture = {
  success: true;
  data: {
    resultId: string;
    category: 'early_stage' | 'foundational' | 'ready_to_pilot' | 'ready_to_scale';
    categoryLabel: string;
    score: number;
    summary: string;
    nextStep: string;
    cta: {
      label: string;
      url: string;
    };
  };
};

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

function createResultResponse(): ReadinessResultFixture {
  return {
    success: true,
    data: {
      resultId: 'result_early_stage_001',
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
  };
}

function mockAuthenticatedSupabaseSession() {
  vi.mocked(createClient).mockReturnValue({
    auth: {
      getSession: supabaseMocks.getSessionMock
    }
  } as unknown as ReturnType<typeof createClient>);

  supabaseMocks.getSessionMock.mockResolvedValue({
    data: {
      session: {
        access_token: RESULT_ACCESS_TOKEN,
        user: {
          id: 'user_123',
          email: 'jane@example.com'
        }
      }
    },
    error: null
  });
}

function mockUnauthenticatedSupabaseSession() {
  vi.mocked(createClient).mockReturnValue({
    auth: {
      getSession: supabaseMocks.getSessionMock
    }
  } as unknown as ReturnType<typeof createClient>);

  supabaseMocks.getSessionMock.mockResolvedValue({
    data: {
      session: null
    },
    error: null
  });
}

function installResultFetchMock(options: {
  linkStatus?: number;
  linkResponse?: Promise<Response> | Response;
  resultStatus?: number;
  resultResponse?: Promise<Response> | Response;
}) {
  const requestLog: Array<{
    method: string;
    url: string;
    body?: Record<string, unknown>;
  }> = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');

    if (url.endsWith('/api/readiness-check/link-session') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      requestLog.push({ method, url, body });

      if (options.linkResponse) {
        return options.linkResponse;
      }

      return jsonResponse({ success: true, data: { linked: true } }, options.linkStatus ?? 200);
    }

    if (url.includes('/api/readiness-check/result/') && method === 'GET') {
      requestLog.push({ method, url });

      if (options.resultResponse) {
        return options.resultResponse;
      }

      return jsonResponse(createResultResponse(), options.resultStatus ?? 200);
    }

    if (url.endsWith('/api/readiness-check/questions') && method === 'GET') {
      return jsonResponse({
        success: true,
        data: {
          version: '1.0',
          totalQuestions: 7,
          estimatedMinutes: 2,
          questions: []
        }
      });
    }

    if (url.endsWith('/api/readiness-check/session') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { sessionToken?: string };

      return jsonResponse({
        success: true,
        data: {
          sessionToken: body.sessionToken ?? RESULT_SESSION_TOKEN,
          status: 'completed',
          answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
          nextQuestionIndex: 7,
          totalQuestions: 7
        }
      });
    }

    if (url.includes('/api/readiness-check/session/') && method === 'GET') {
      const token = url.split('/').pop() ?? RESULT_SESSION_TOKEN;

      return jsonResponse({
        success: true,
        data: {
          sessionToken: token,
          status: 'completed',
          answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
          nextQuestionIndex: 7,
          totalQuestions: 7
        }
      });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return { fetchMock, requestLog };
}

function resetBrowserState() {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/readiness/result');
}

async function renderResultPage() {
  render(await ReadinessResultPage());
}

describe('result screen UI contract', () => {
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

  it('renders the protected result screen with category, score, summary, next-step text, and CTA target', async () => {
    mockAuthenticatedSupabaseSession();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);

    const resultResponse = createResultResponse();
    const { requestLog } = installResultFetchMock({
      linkResponse: jsonResponse({ success: true, data: { linked: true } }),
      resultResponse: jsonResponse(resultResponse)
    });

    await renderResultPage();

    expect(screen.getByText(/loading your results/i)).toBeVisible();

    await screen.findByText(resultResponse.data.categoryLabel);

    expect(screen.getByText('18')).toBeVisible();
    expect(screen.getByText('/100')).toBeVisible();
    expect(screen.getByText(/beginning of the AI journey/i)).toBeVisible();
    expect(screen.getByText(/short conversation about your business/i)).toBeVisible();
    expect(screen.getByRole('link', { name: resultResponse.data.cta.label })).toHaveAttribute(
      'href',
      resultResponse.data.cta.url
    );
    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
    expect(requestLog).toMatchObject([
      {
        method: 'POST',
        url: '/api/readiness-check/link-session',
        body: {
          sessionToken: RESULT_SESSION_TOKEN
        }
      },
      {
        method: 'GET',
        url: `/api/readiness-check/result/${RESULT_SESSION_TOKEN}`
      }
    ]);
  });

  it('keeps the loading state visible while the protected result fetch is pending', async () => {
    const resultDeferred = createDeferred<Response>();

    mockAuthenticatedSupabaseSession();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);

    const { requestLog } = installResultFetchMock({
      linkResponse: jsonResponse({ success: true, data: { linked: true } }),
      resultResponse: resultDeferred.promise
    });

    await renderResultPage();

    expect(screen.getByText(/loading your results/i)).toBeVisible();

    resultDeferred.resolve(jsonResponse(createResultResponse()));

    await screen.findByText('Early-Stage');
    expect(screen.getByRole('link', { name: /start with a conversation/i })).toHaveAttribute(
      'href',
      '/contact?source=readiness_check&result=early_stage'
    );
    expect(requestLog).toHaveLength(2);
  });

  it('keeps auth-missing access user-safe and does not render protected result data', async () => {
    mockUnauthenticatedSupabaseSession();
    window.localStorage.removeItem('readiness_session_token');

    const { requestLog } = installResultFetchMock({
      linkResponse: jsonResponse({ success: true, data: { linked: true } }),
      resultResponse: jsonResponse(createResultResponse())
    });

    await renderResultPage();

    await waitFor(() => {
      const routedBack = navigationMocks.pushMock.mock.calls.some(([target]) => target === '/readiness');
      const returnLink = screen.queryByRole('link', {
        name: /back to assessment start|return to readiness/i
      });

      expect(routedBack || Boolean(returnLink)).toBe(true);
    });

    expect(screen.queryByText('Early-Stage')).not.toBeInTheDocument();
    expect(screen.queryByText('18')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /start with a conversation/i })).not.toBeInTheDocument();
    expect(requestLog).toHaveLength(0);
  });

  it('keeps protected-result fetch failures user-safe and does not crash', async () => {
    mockAuthenticatedSupabaseSession();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);

    const { requestLog } = installResultFetchMock({
      linkResponse: jsonResponse({ success: true, data: { linked: true } }),
      resultStatus: 500,
      resultResponse: jsonResponse(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Requested readiness result failed.'
          }
        },
        500
      )
    });

    await renderResultPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent(/unable to load|try again|result/i);
    expect(screen.queryByText('Early-Stage')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /start with a conversation/i })).not.toBeInTheDocument();
    expect(requestLog).toHaveLength(2);
  });
});
