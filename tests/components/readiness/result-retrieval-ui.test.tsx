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

type ResultRouteResponse = {
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
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

function createResultResponse(): ResultRouteResponse {
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
    headers?: HeadersInit;
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
      requestLog.push({ method, url, body, headers: init?.headers });
      if (options.linkResponse) {
        return options.linkResponse;
      }

      return jsonResponse({ success: true, data: { linked: true } }, options.linkStatus ?? 200);
    }

    if (url.includes('/api/readiness-check/result/') && method === 'GET') {
      requestLog.push({ method, url, headers: init?.headers });
      if (options.resultResponse) {
        return options.resultResponse;
      }

      return jsonResponse(createResultResponse(), options.resultStatus ?? 200);
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

describe('result retrieval UI contract', () => {
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

  it('links the completed anonymous session before fetching the result and then renders the protected result surface', async () => {
    const linkDeferred = createDeferred<Response>();
    const resultDeferred = createDeferred<Response>();

    mockAuthenticatedSupabaseSession();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);

    const { fetchMock, requestLog } = installResultFetchMock({
      linkResponse: linkDeferred.promise,
      resultResponse: resultDeferred.promise
    });

    await renderResultPage();

    expect(screen.getByText(/loading your results/i)).toBeVisible();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(requestLog[0]).toMatchObject({
      method: 'POST',
      url: '/api/readiness-check/link-session',
      body: {
        sessionToken: RESULT_SESSION_TOKEN
      }
    });

    linkDeferred.resolve(jsonResponse({ success: true, data: { linked: true } }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(requestLog[1]).toMatchObject({
      method: 'GET',
      url: `/api/readiness-check/result/${RESULT_SESSION_TOKEN}`
    });

    resultDeferred.resolve(jsonResponse(createResultResponse()));

    expect(await screen.findByText('Early-Stage')).toBeVisible();
    expect(screen.getByText('18')).toBeVisible();
    expect(screen.getByText('/100')).toBeVisible();
    expect(screen.getByText(/good news is that starting with a clear picture/i)).toBeVisible();
    expect(screen.getByText(/a short conversation about your business/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /start with a conversation/i })).toHaveAttribute(
      'href',
      '/contact?source=readiness_check&result=early_stage'
    );
    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });

  it('shows a restart-safe session-not-found state when link-session returns 404', async () => {
    mockAuthenticatedSupabaseSession();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);

    const { fetchMock } = installResultFetchMock({
      linkStatus: 404
    });

    await renderResultPage();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/session not found|start again|restart/i);
    expect(screen.queryByText('Early-Stage')).not.toBeInTheDocument();
  });

  it('shows a safe wrong-account state when link-session returns 403', async () => {
    mockAuthenticatedSupabaseSession();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);

    const { fetchMock } = installResultFetchMock({
      linkStatus: 403
    });

    await renderResultPage();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/different account/i);
    expect(screen.queryByText('Early-Stage')).not.toBeInTheDocument();
  });

  it('shows a restart-or-retry state when result retrieval returns 404 for an incomplete session', async () => {
    mockAuthenticatedSupabaseSession();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);

    const { fetchMock } = installResultFetchMock({
      linkStatus: 200,
      resultStatus: 404
    });

    await renderResultPage();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/restart|retry|not ready|incomplete/i);
    expect(screen.queryByText('Early-Stage')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated access back to /readiness or offers a return link without rendering result data', async () => {
    mockUnauthenticatedSupabaseSession();
    window.localStorage.setItem('readiness_session_token', RESULT_SESSION_TOKEN);

    const { fetchMock } = installResultFetchMock({
      linkStatus: 200,
      resultStatus: 200
    });

    await renderResultPage();

    await waitFor(() => {
      const redirected = navigationMocks.pushMock.mock.calls.some(([target]) => target === '/readiness');
      const returnLink = screen.queryByRole('link', {
        name: /back to assessment start|return to readiness/i
      });

      expect(redirected || Boolean(returnLink)).toBe(true);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Early-Stage')).not.toBeInTheDocument();
  });
});
