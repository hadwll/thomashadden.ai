import { beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/readiness-check/answer/route';
import { READINESS_QUESTION_SET } from '@/lib/readiness/question-set';
import {
  getReadinessSession,
  READINESS_TOTAL_QUESTIONS,
  resetReadinessSessionStoreForTests,
  seedReadinessSessionForTests
} from '@/lib/readiness/session-store';

const VALID_SESSION_TOKEN = '66666666-6666-4666-8666-666666666666';
const UNKNOWN_SESSION_TOKEN = '77777777-7777-4777-8777-777777777777';

const [QUESTION_1, QUESTION_2, QUESTION_3, QUESTION_4, QUESTION_5, QUESTION_6, QUESTION_7] =
  READINESS_QUESTION_SET.questions;

// The write contract uses `questionId` + `optionId`, while completion is reported via
// `answeredCount` / `isComplete`; this test locks the fixed 7-question set behind that naming.

function buildRequest(body: unknown) {
  return new Request('http://localhost/api/readiness-check/answer', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

async function invokeAnswer(body: unknown) {
  const response = await POST(buildRequest(body));
  const payload = (await response.json()) as Record<string, unknown>;

  return { response, payload };
}

function expectMeta(meta: unknown) {
  const maybeMeta = meta as { requestId?: unknown; timestamp?: unknown };

  expect(typeof maybeMeta.requestId).toBe('string');
  expect(typeof maybeMeta.timestamp).toBe('string');
}

async function seedInProgressSession(sessionToken = VALID_SESSION_TOKEN) {
  await seedReadinessSessionForTests({
    sessionToken,
    status: 'in_progress',
    answeredQuestions: [],
    nextQuestionIndex: 0,
    totalQuestions: READINESS_TOTAL_QUESTIONS
  });
}

async function submitAnswers(
  sessionToken: string,
  answers: Array<{ questionId: string; optionId: string }>
) {
  const responses = [];

  for (const answer of answers) {
    responses.push(await invokeAnswer({ sessionToken, ...answer }));
  }

  return responses;
}

describe('POST /api/readiness-check/answer contract lock', () => {
  beforeEach(async () => {
    await resetReadinessSessionStoreForTests();
  });

  it.each([
    {
      title: 'missing sessionToken',
      body: {
        questionId: QUESTION_1.id,
        optionId: QUESTION_1.options[0].id
      }
    },
    {
      title: 'missing questionId',
      body: {
        sessionToken: VALID_SESSION_TOKEN,
        optionId: QUESTION_1.options[0].id
      }
    },
    {
      title: 'missing optionId',
      body: {
        sessionToken: VALID_SESSION_TOKEN,
        questionId: QUESTION_1.id
      }
    }
  ])('returns 422 VALIDATION_ERROR for $title', async ({ body }) => {
    const { response, payload } = await invokeAnswer(body);

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body failed validation.'
      }
    });
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR for malformed JSON payloads', async () => {
    const { response, payload } = await invokeAnswer('{"sessionToken":');

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body failed validation.',
        details: {
          field: 'body',
          reason: 'Malformed JSON body.'
        }
      }
    });
    expectMeta(payload.meta);
  });

  it('returns 404 NOT_FOUND for an unknown but valid-shape sessionToken', async () => {
    const { response, payload } = await invokeAnswer({
      sessionToken: UNKNOWN_SESSION_TOKEN,
      questionId: QUESTION_1.id,
      optionId: QUESTION_1.options[0].id
    });

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Requested readiness session was not found.'
      }
    });
    expectMeta(payload.meta);
  });

  it('treats the same session/question/option tuple as an idempotent duplicate answer', async () => {
    await seedInProgressSession();

    const first = await invokeAnswer({
      sessionToken: VALID_SESSION_TOKEN,
      questionId: QUESTION_1.id,
      optionId: QUESTION_1.options[0].id
    });
    const second = await invokeAnswer({
      sessionToken: VALID_SESSION_TOKEN,
      questionId: QUESTION_1.id,
      optionId: QUESTION_1.options[0].id
    });
    const storedSession = getReadinessSession(VALID_SESSION_TOKEN);

    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    expect(first.payload).toMatchObject({
      success: true,
      data: {
        answeredCount: 1,
        isComplete: false
      }
    });
    expect(second.payload).toMatchObject({
      success: true,
      data: {
        answeredCount: 1,
        isComplete: false
      }
    });
    expect(storedSession?.answeredQuestions).toEqual([0]);
    expect(Object.keys(storedSession?.answersByQuestionId ?? {})).toHaveLength(1);
    expect(storedSession?.answersByQuestionId[QUESTION_1.id]?.optionId).toBe(QUESTION_1.options[0].id);
    expectMeta(first.payload.meta);
    expectMeta(second.payload.meta);
  });

  it('returns 409 CONFLICT when the same question is answered with a different optionId', async () => {
    await seedInProgressSession();

    const first = await invokeAnswer({
      sessionToken: VALID_SESSION_TOKEN,
      questionId: QUESTION_1.id,
      optionId: QUESTION_1.options[0].id
    });
    const second = await invokeAnswer({
      sessionToken: VALID_SESSION_TOKEN,
      questionId: QUESTION_1.id,
      optionId: QUESTION_1.options[1].id
    });

    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(409);
    expect(second.payload).toMatchObject({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Answer already recorded for this question.'
      }
    });
    expectMeta(second.payload.meta);
  });

  it('completes exactly on the 7th unique answer and stays aligned to the fixed 7-question set', async () => {
    await seedInProgressSession();

    const answers = READINESS_QUESTION_SET.questions.map((question) => ({
      questionId: question.id,
      optionId: question.options[0].id
    }));

    const responses = await submitAnswers(VALID_SESSION_TOKEN, answers);
    const finalResponse = responses[responses.length - 1];
    const storedSession = getReadinessSession(VALID_SESSION_TOKEN);

    expect(READINESS_QUESTION_SET.totalQuestions).toBe(7);
    expect(READINESS_QUESTION_SET.questions).toHaveLength(7);
    expect(finalResponse.response.status).toBe(200);
    expect(finalResponse.payload).toMatchObject({
      success: true,
      data: {
        answeredCount: 7,
        isComplete: true
      }
    });
    expect(storedSession).toMatchObject({
      sessionToken: VALID_SESSION_TOKEN,
      status: 'completed',
      answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
      nextQuestionIndex: 7,
      totalQuestions: 7
    });
    expect(storedSession?.resultCategory).toBeDefined();
    expect(storedSession?.resultScore).toEqual(expect.any(Number));
    expectMeta(finalResponse.payload.meta);
  });

  it('returns 409 CONFLICT when a completed session receives another answer attempt', async () => {
    await seedReadinessSessionForTests({
      sessionToken: VALID_SESSION_TOKEN,
      status: 'completed',
      answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
      nextQuestionIndex: READINESS_TOTAL_QUESTIONS,
      totalQuestions: READINESS_TOTAL_QUESTIONS
    });

    const { response, payload } = await invokeAnswer({
      sessionToken: VALID_SESSION_TOKEN,
      questionId: QUESTION_7.id,
      optionId: QUESTION_7.options[0].id
    });

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Readiness session is no longer accepting answers.'
      }
    });
    expectMeta(payload.meta);
  });
});
