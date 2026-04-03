import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadinessCheck } from '@/components/readiness/ReadinessCheck';
import { READINESS_QUESTION_SET } from '@/lib/readiness/question-set';

const ORIGINAL_FETCH = global.fetch;
const RESUMABLE_SESSION_TOKEN = '88888888-8888-4888-8888-888888888888';
const ABANDONED_SESSION_TOKEN = '99999999-9999-4999-8999-999999999999';
const RESTART_SESSION_TOKEN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type QuestionSetPayload = typeof READINESS_QUESTION_SET;

type SessionStateFixture = {
  sessionToken: string;
  status: 'in_progress' | 'abandoned' | 'completed';
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: 7;
};

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

function createQuestionSetResponse(): { success: true; data: QuestionSetPayload } {
  return {
    success: true,
    data: READINESS_QUESTION_SET
  };
}

function createSessionCreateResponse(sessionToken: string) {
  return {
    success: true,
    data: {
      sessionToken,
      status: 'in_progress' as const,
      totalQuestions: 7
    }
  };
}

function createSessionStateResponse(session: SessionStateFixture) {
  return {
    success: true,
    data: session
  };
}

function getRequestUrlAndMethod(input: RequestInfo | URL, init?: RequestInit) {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');

  return { url, method };
}

function getProgressIndicator(questionNumber: number) {
  const progressText = screen.queryByText(new RegExp(`question ${questionNumber} of 7`, 'i'));
  if (progressText) {
    return progressText;
  }

  return screen.queryByRole('progressbar', {
    name: new RegExp(`question ${questionNumber} of 7`, 'i')
  });
}

function installReadinessFetchMock(options: {
  sessionStateByToken: Record<string, SessionStateFixture>;
}) {
  const requestLog: Array<{ method: string; url: string; body?: Record<string, unknown> }> = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, method } = getRequestUrlAndMethod(input, init);

    if (url.endsWith('/api/readiness-check/questions') && method === 'GET') {
      requestLog.push({ method, url });
      return createJsonResponse(createQuestionSetResponse());
    }

    if (url.endsWith('/api/readiness-check/session') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as { sessionToken?: string };
      requestLog.push({ method, url, body: requestBody });
      const sessionToken = requestBody.sessionToken ?? RESUMABLE_SESSION_TOKEN;
      return createJsonResponse(createSessionCreateResponse(sessionToken));
    }

    if (url.includes('/api/readiness-check/session/') && method === 'GET') {
      const token = url.split('/').pop() ?? '';
      requestLog.push({ method, url });
      const fixture = options.sessionStateByToken[token];

      if (!fixture) {
        return createJsonResponse(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Requested readiness session was not found.'
            }
          },
          404
        );
      }

      return createJsonResponse(createSessionStateResponse(fixture));
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return {
    fetchMock,
    requestLog
  };
}

function resetBrowserState() {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/');
}

describe('ReadinessCheck contract lock', () => {
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

  it('resumes an in-progress session on the existing path instead of forcing a restart prompt', async () => {
    const user = userEvent.setup();
    const { fetchMock, requestLog } = installReadinessFetchMock({
      sessionStateByToken: {
        [RESUMABLE_SESSION_TOKEN]: {
          sessionToken: RESUMABLE_SESSION_TOKEN,
          status: 'in_progress',
          answeredQuestions: [0, 1, 2],
          nextQuestionIndex: 3,
          totalQuestions: 7
        }
      }
    });

    window.localStorage.setItem('readiness_session_token', RESUMABLE_SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[3].text);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(screen.queryByText(/continue where you left off\?/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start again/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.getByText(READINESS_QUESTION_SET.questions[3].text)).toBeVisible();
    expect(getProgressIndicator(4)).toBeVisible();
    expect(window.localStorage.getItem('readiness_session_token')).toBe(RESUMABLE_SESSION_TOKEN);
    expect(window.localStorage.getItem('readiness_session_started')).toBe('2026-04-03T11:30:00.000Z');
    expect(requestLog.filter((entry) => entry.method === 'POST' && entry.url.endsWith('/session'))).toHaveLength(0);
  });

  it('shows restart behavior for abandoned sessions and restarts back to question 1', async () => {
    const user = userEvent.setup();
    const randomUUIDSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(RESTART_SESSION_TOKEN);
    const { fetchMock, requestLog } = installReadinessFetchMock({
      sessionStateByToken: {
        [ABANDONED_SESSION_TOKEN]: {
          sessionToken: ABANDONED_SESSION_TOKEN,
          status: 'abandoned',
          answeredQuestions: [0, 1, 2],
          nextQuestionIndex: 3,
          totalQuestions: 7
        }
      }
    });

    window.localStorage.setItem('readiness_session_token', ABANDONED_SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(/continue where you left off\?/i);

    expect(fetchMock).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /start again/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /start again/i }));

    await screen.findByText(READINESS_QUESTION_SET.questions[0].text);

    expect(randomUUIDSpy).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('readiness_session_token')).toBe(RESTART_SESSION_TOKEN);
    expect(screen.getByText(READINESS_QUESTION_SET.questions[0].text)).toBeVisible();
    expect(getProgressIndicator(1)).toBeVisible();
    expect(requestLog.some((entry) => entry.method === 'POST' && entry.url.endsWith('/api/readiness-check/session'))).toBe(true);
  });

  it('keeps a completed session on the results-ready path rather than falling back to restart copy', async () => {
    const { fetchMock } = installReadinessFetchMock({
      sessionStateByToken: {
        [RESUMABLE_SESSION_TOKEN]: {
          sessionToken: RESUMABLE_SESSION_TOKEN,
          status: 'completed',
          answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
          nextQuestionIndex: 7,
          totalQuestions: 7
        }
      }
    });

    window.localStorage.setItem('readiness_session_token', RESUMABLE_SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(/your results are ready/i);

    expect(fetchMock).toHaveBeenCalled();
    expect(screen.queryByText(/continue where you left off\?/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start again/i })).not.toBeInTheDocument();
    expect(screen.queryByText(READINESS_QUESTION_SET.questions[6].text)).not.toBeInTheDocument();
  });
});
