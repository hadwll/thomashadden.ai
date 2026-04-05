import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadinessCheck } from '@/components/readiness/ReadinessCheck';
import { READINESS_QUESTION_SET } from '@/lib/readiness/question-set';

const ORIGINAL_FETCH = global.fetch;
const FRESH_SESSION_TOKEN = '11111111-1111-4111-8111-111111111111';
const RECOVERY_SESSION_TOKEN = '22222222-2222-4222-8222-222222222222';
const RESTART_SESSION_TOKEN = '33333333-3333-4333-8333-333333333333';

type QuestionSetPayload = typeof READINESS_QUESTION_SET;

type SessionStateFixture = {
  sessionToken: string;
  status: 'in_progress' | 'abandoned' | 'completed';
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: 7;
};

type AnswerResponseFixture = {
  status: number;
  payload:
    | {
        success: true;
        data: {
          answeredCount: number;
          isComplete: boolean;
        };
      }
    | {
        success: false;
        error: {
          code: 'CONFLICT' | 'VALIDATION_ERROR' | 'NOT_FOUND';
          message: string;
        };
      };
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

function createAnswerSuccessResponse(answeredCount: number, isComplete: boolean) {
  return {
    success: true,
    data: {
      answeredCount,
      isComplete
    }
  };
}

function createAnswerConflictResponse() {
  return {
    success: false,
    error: {
      code: 'CONFLICT' as const,
      message: 'Answer already recorded for this question.'
    }
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
  sessionStateByToken?: Record<string, SessionStateFixture>;
  answerResponses?: AnswerResponseFixture[];
}) {
  const answerRequests: Array<{ sessionToken?: string; questionId?: string; optionId?: string }> = [];
  let answerCallIndex = 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, method } = getRequestUrlAndMethod(input, init);

    if (url.endsWith('/api/readiness-check/questions') && method === 'GET') {
      return createJsonResponse(createQuestionSetResponse());
    }

    if (url.endsWith('/api/readiness-check/session') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as { sessionToken?: string };
      const sessionToken = requestBody.sessionToken ?? FRESH_SESSION_TOKEN;
      return createJsonResponse(createSessionCreateResponse(sessionToken));
    }

    if (url.includes('/api/readiness-check/session/') && method === 'GET') {
      const token = url.split('/').pop() ?? '';
      const fixture = options.sessionStateByToken?.[token];
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

    if (url.endsWith('/api/readiness-check/answer') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as {
        sessionToken?: string;
        questionId?: string;
        optionId?: string;
      };
      answerRequests.push(requestBody);

      const nextResponse =
        options.answerResponses?.[Math.min(answerCallIndex, options.answerResponses.length - 1)] ??
        options.answerResponses?.[options.answerResponses.length - 1];
      answerCallIndex += 1;

      if (!nextResponse) {
        throw new Error('No answer response fixture was provided.');
      }

      return createJsonResponse(nextResponse.payload, nextResponse.status);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return {
    answerRequests,
    fetchMock
  };
}

describe('ReadinessCheck flow UI contract', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    global.fetch = ORIGINAL_FETCH;
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    global.fetch = ORIGINAL_FETCH;
  });

  it('renders the first question with visible progress and requires explicit Next before advancing', async () => {
    const user = userEvent.setup();
    const randomUUIDSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(FRESH_SESSION_TOKEN);
    const { answerRequests, fetchMock } = installReadinessFetchMock({
      answerResponses: [
        {
          status: 200,
          payload: createAnswerSuccessResponse(1, false)
        }
      ]
    });

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[0].text);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(randomUUIDSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(READINESS_QUESTION_SET.questions[0].text)).toBeVisible();
    expect(screen.getByRole('button', { name: READINESS_QUESTION_SET.questions[0].options[0].label })).toBeVisible();
    expect(screen.getByRole('button', { name: READINESS_QUESTION_SET.questions[0].options[1].label })).toBeVisible();
    expect(screen.getByRole('button', { name: READINESS_QUESTION_SET.questions[0].options[2].label })).toBeVisible();
    expect(screen.getByRole('button', { name: READINESS_QUESTION_SET.questions[0].options[3].label })).toBeVisible();
    expect(screen.getByRole('button', { name: READINESS_QUESTION_SET.questions[0].options[4].label })).toBeVisible();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    expect(getProgressIndicator(1)).toBeVisible();

    await user.click(screen.getByRole('button', { name: READINESS_QUESTION_SET.questions[0].options[0].label }));

    await waitFor(() => {
      expect(answerRequests).toHaveLength(1);
    });

    expect(answerRequests[0]).toMatchObject({
      sessionToken: FRESH_SESSION_TOKEN,
      questionId: READINESS_QUESTION_SET.questions[0].id,
      optionId: READINESS_QUESTION_SET.questions[0].options[0].id
    });
    expect(screen.getByText(READINESS_QUESTION_SET.questions[0].text)).toBeVisible();
    expect(screen.queryByText(READINESS_QUESTION_SET.questions[1].text)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    expect(getProgressIndicator(1)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /next/i }));

    await screen.findByText(READINESS_QUESTION_SET.questions[1].text);

    expect(screen.queryByText(READINESS_QUESTION_SET.questions[0].text)).not.toBeInTheDocument();
    expect(screen.getByText(READINESS_QUESTION_SET.questions[1].text)).toBeVisible();
    expect(getProgressIndicator(2)).toBeVisible();
  });

  it('keeps the current question stable when an answer save conflict is returned', async () => {
    const user = userEvent.setup();
    const { fetchMock } = installReadinessFetchMock({
      sessionStateByToken: {
        [RECOVERY_SESSION_TOKEN]: {
          sessionToken: RECOVERY_SESSION_TOKEN,
          status: 'in_progress',
          answeredQuestions: [],
          nextQuestionIndex: 0,
          totalQuestions: 7
        }
      },
      answerResponses: [
        {
          status: 409,
          payload: createAnswerConflictResponse()
        }
      ]
    });

    window.localStorage.setItem('readiness_session_token', RECOVERY_SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[0].text);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: READINESS_QUESTION_SET.questions[0].options[1].label }));

    const alert = await screen.findByRole('alert');

    expect(alert).toBeVisible();
    expect(alert).not.toHaveTextContent(/409|conflict|already recorded/i);
    expect(alert).toHaveTextContent(/try again|unable|save that answer/i);
    expect(screen.getByText(READINESS_QUESTION_SET.questions[0].text)).toBeVisible();
    expect(screen.queryByText(READINESS_QUESTION_SET.questions[1].text)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('restores a detected abandoned session and returns to the first question after restart', async () => {
    const user = userEvent.setup();
    const randomUUIDSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(RESTART_SESSION_TOKEN);
    const { fetchMock } = installReadinessFetchMock({
      sessionStateByToken: {
        [RECOVERY_SESSION_TOKEN]: {
          sessionToken: RECOVERY_SESSION_TOKEN,
          status: 'abandoned',
          answeredQuestions: [0, 1, 2],
          nextQuestionIndex: 3,
          totalQuestions: 7
        }
      }
    });

    window.localStorage.setItem('readiness_session_token', RECOVERY_SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(screen.getByText(/continue where you left off\?/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /start again/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /start again/i }));

    await screen.findByText(READINESS_QUESTION_SET.questions[0].text);

    expect(randomUUIDSpy).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('readiness_session_token')).toBe(RESTART_SESSION_TOKEN);
    expect(screen.getByText(READINESS_QUESTION_SET.questions[0].text)).toBeVisible();
    expect(getProgressIndicator(1)).toBeVisible();
  });

  it('replaces the question UI with the completion state after the final answer succeeds', async () => {
    const user = userEvent.setup();
    const { answerRequests, fetchMock } = installReadinessFetchMock({
      sessionStateByToken: {
        [RECOVERY_SESSION_TOKEN]: {
          sessionToken: RECOVERY_SESSION_TOKEN,
          status: 'in_progress',
          answeredQuestions: [],
          nextQuestionIndex: 0,
          totalQuestions: 7
        }
      },
      answerResponses: [
        { status: 200, payload: createAnswerSuccessResponse(1, false) },
        { status: 200, payload: createAnswerSuccessResponse(2, false) },
        { status: 200, payload: createAnswerSuccessResponse(3, false) },
        { status: 200, payload: createAnswerSuccessResponse(4, false) },
        { status: 200, payload: createAnswerSuccessResponse(5, false) },
        { status: 200, payload: createAnswerSuccessResponse(6, false) },
        { status: 200, payload: createAnswerSuccessResponse(7, true) }
      ]
    });

    window.localStorage.setItem('readiness_session_token', RECOVERY_SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[0].text);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    for (let index = 0; index < READINESS_QUESTION_SET.questions.length; index += 1) {
      const question = READINESS_QUESTION_SET.questions[index];
      const selectedOption = question.options[0];

      await user.click(screen.getByRole('button', { name: selectedOption.label }));

      await waitFor(() => {
        expect(answerRequests).toHaveLength(index + 1);
      });

      if (index < READINESS_QUESTION_SET.questions.length - 1) {
        await user.click(screen.getByRole('button', { name: /next/i }));
        await screen.findByText(READINESS_QUESTION_SET.questions[index + 1].text);
        continue;
      }
    }

    expect(screen.getByText(/your results are ready/i)).toBeVisible();
    expect(screen.queryByText(READINESS_QUESTION_SET.questions[6].text)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /see my results/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /linkedin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /email/i })).not.toBeInTheDocument();
  });
});
