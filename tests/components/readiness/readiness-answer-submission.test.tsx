import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadinessCheck } from '@/components/readiness/ReadinessCheck';
import { READINESS_QUESTION_SET } from '@/lib/readiness/question-set';

const ORIGINAL_FETCH = global.fetch;
const SESSION_TOKEN = '123e4567-e89b-12d3-a456-426614174000';

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

function createQuestionSetResponse() {
  return {
    success: true,
    data: READINESS_QUESTION_SET,
    meta: {
      requestId: 'req_readiness_questions_001',
      timestamp: '2026-04-03T12:00:00.000Z'
    }
  };
}

function createSessionCreateResponse(sessionToken: string) {
  return {
    success: true,
    data: {
      sessionToken,
      status: 'in_progress',
      totalQuestions: 7
    },
    meta: {
      requestId: 'req_readiness_session_create_001',
      timestamp: '2026-04-03T12:00:00.000Z'
    }
  };
}

function createSessionStateResponse(
  sessionToken: string,
  answeredQuestions: number[],
  nextQuestionIndex: number,
  status: 'in_progress' | 'abandoned' = 'in_progress'
) {
  return {
    success: true,
    data: {
      sessionToken,
      status,
      answeredQuestions,
      nextQuestionIndex,
      totalQuestions: 7
    },
    meta: {
      requestId: 'req_readiness_session_get_001',
      timestamp: '2026-04-03T12:00:00.000Z'
    }
  };
}

function createAnswerResponse(
  body:
    | { success: true; data: { answeredCount: number; isComplete: boolean } }
    | { success: false; error: { code: 'CONFLICT' | 'VALIDATION_ERROR' | 'NOT_FOUND'; message: string } }
) {
  return {
    ...body,
    meta: {
      requestId: 'req_readiness_answer_001',
      timestamp: '2026-04-03T12:00:00.000Z'
    }
  };
}

function installReadinessFetchMock(options: {
  answerStatus?: number;
  answerPayload: ReturnType<typeof createAnswerResponse>;
  answeredQuestions?: number[];
  nextQuestionIndex?: number;
}) {
  const answerRequests: Array<{ sessionToken?: string; questionId?: string; optionId?: string }> = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/api/readiness-check/questions') && method === 'GET') {
      return createJsonResponse(createQuestionSetResponse());
    }

    if (url.endsWith('/api/readiness-check/session') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as { sessionToken?: string };
      return createJsonResponse(createSessionCreateResponse(requestBody.sessionToken ?? SESSION_TOKEN));
    }

    if (url.includes('/api/readiness-check/session/') && method === 'GET') {
      const token = url.split('/').pop() ?? SESSION_TOKEN;

      return createJsonResponse(
        createSessionStateResponse(
          token,
          options.answeredQuestions ?? [],
          options.nextQuestionIndex ?? 0
        )
      );
    }

    if (url.endsWith('/api/readiness-check/answer') && method === 'POST') {
      const requestBody = JSON.parse(String(init?.body ?? '{}')) as {
        sessionToken?: string;
        questionId?: string;
        optionId?: string;
      };

      answerRequests.push(requestBody);
      return createJsonResponse(options.answerPayload, options.answerStatus ?? 200);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return { fetchMock, answerRequests };
}

describe('ReadinessCheck answer submission wiring', () => {
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

  it('submits the selected option to /api/readiness-check/answer before the UI advances', async () => {
    const user = userEvent.setup();
    const { fetchMock, answerRequests } = installReadinessFetchMock({
      answerPayload: createAnswerResponse({
        success: true,
        data: { answeredCount: 1, isComplete: false }
      })
    });

    window.localStorage.setItem('readiness_session_token', SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[0].text);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const firstOption = READINESS_QUESTION_SET.questions[0].options[0];

    await user.click(await screen.findByRole('button', { name: firstOption.label }));

    await waitFor(() => {
      expect(answerRequests).toHaveLength(1);
    });

    expect(answerRequests[0]).toMatchObject({
      sessionToken: SESSION_TOKEN,
      questionId: READINESS_QUESTION_SET.questions[0].id,
      optionId: firstOption.id
    });

    await user.click(await screen.findByRole('button', { name: /next/i }));
  });

  it('advances away from the previous question after a non-complete answer response', async () => {
    const user = userEvent.setup();
    const { fetchMock, answerRequests } = installReadinessFetchMock({
      answerPayload: createAnswerResponse({
        success: true,
        data: { answeredCount: 1, isComplete: false }
      })
    });

    window.localStorage.setItem('readiness_session_token', SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[0].text);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const firstOption = READINESS_QUESTION_SET.questions[0].options[0];
    const secondQuestion = READINESS_QUESTION_SET.questions[1];

    await user.click(await screen.findByRole('button', { name: firstOption.label }));

    await waitFor(() => {
      expect(answerRequests).toHaveLength(1);
    });

    await user.click(await screen.findByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.queryByText(READINESS_QUESTION_SET.questions[0].text)).not.toBeInTheDocument();
    });

    expect(screen.getByText(secondQuestion.text)).toBeVisible();
  });

  it('renders a user-safe error state when the answer route returns a duplicate or conflict response', async () => {
    const user = userEvent.setup();
    const { fetchMock } = installReadinessFetchMock({
      answerStatus: 409,
      answerPayload: createAnswerResponse(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Answer already recorded for this question.'
          }
        },
        409
      )
    });

    window.localStorage.setItem('readiness_session_token', SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[0].text);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    await user.click(await screen.findByRole('button', { name: READINESS_QUESTION_SET.questions[0].options[0].label }));

    const alert = await screen.findByRole('alert');

    expect(alert).toBeVisible();
    expect(alert).not.toHaveTextContent(/CONFLICT|409|already recorded|duplicate/i);
    expect(alert).toHaveTextContent(/try again|something went wrong|unable|answer/i);
  });

  it('shows the results-ready completion state after the final question completes', async () => {
    const user = userEvent.setup();
    const { fetchMock, answerRequests } = installReadinessFetchMock({
      answerPayload: createAnswerResponse({
        success: true,
        data: { answeredCount: 7, isComplete: true }
      }),
      answeredQuestions: [0, 1, 2, 3, 4, 5],
      nextQuestionIndex: 6
    });

    window.localStorage.setItem('readiness_session_token', SESSION_TOKEN);
    window.localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');

    render(<ReadinessCheck />);

    await screen.findByText(READINESS_QUESTION_SET.questions[6].text);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const finalQuestion = READINESS_QUESTION_SET.questions[6];
    const finalOption = finalQuestion.options[0];

    await user.click(await screen.findByRole('button', { name: finalOption.label }));

    await waitFor(() => {
      expect(answerRequests).toHaveLength(1);
    });

    await user.click(await screen.findByRole('button', { name: /see my results/i }));

    expect(screen.getByText(/your results are ready/i)).toBeVisible();
    expect(screen.queryByText(finalQuestion.text)).not.toBeInTheDocument();
  });
});
