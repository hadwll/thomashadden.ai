import { beforeEach, describe, expect, it, vi } from 'vitest';
import { READINESS_QUESTION_SET } from '@/lib/readiness/question-set';

type StoredReadinessSession = {
  sessionToken: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: number;
  resultCategory?: 'early_stage' | 'foundational' | 'ready_to_pilot' | 'ready_to_scale';
  resultScore?: number;
  completedAt?: string;
};

const readinessSessionStore = new Map<string, StoredReadinessSession>();

vi.mock('@/lib/readiness/session-store', () => ({
  createReadinessSession: vi.fn(async (sessionToken: string) => {
    const record: StoredReadinessSession = {
      sessionToken,
      status: 'in_progress',
      answeredQuestions: [],
      nextQuestionIndex: 0,
      totalQuestions: 7
    };

    readinessSessionStore.set(sessionToken, record);
    return record;
  }),
  getReadinessSession: vi.fn(async (sessionToken: string) => readinessSessionStore.get(sessionToken) ?? null),
  resetReadinessSessionStoreForTests: vi.fn(async () => {
    readinessSessionStore.clear();
  }),
  seedReadinessSessionForTests: vi.fn(async (record: StoredReadinessSession) => {
    const snapshot: StoredReadinessSession = {
      ...record,
      answeredQuestions: [...record.answeredQuestions]
    };

    readinessSessionStore.set(record.sessionToken, snapshot);
    return snapshot;
  })
}));

import { POST } from '@/app/api/readiness-check/answer/route';
import {
  getReadinessSession,
  resetReadinessSessionStoreForTests,
  seedReadinessSessionForTests
} from '@/lib/readiness/session-store';

const VALID_SESSION_TOKEN = '123e4567-e89b-12d3-a456-426614174000';
const UNKNOWN_SESSION_TOKEN = '223e4567-e89b-12d3-a456-426614174000';

const [QUESTION_1, QUESTION_2, QUESTION_3, QUESTION_4, QUESTION_5, QUESTION_6, QUESTION_7] =
  READINESS_QUESTION_SET.questions;

function buildRequest(body: unknown) {
  return new Request('http://localhost:3000/api/readiness-check/answer', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

async function invokeAnswer(body: unknown) {
  const response = await POST(buildRequest(body));
  const payload = await response.json();

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
    totalQuestions: READINESS_QUESTION_SET.totalQuestions
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

  return {
    responses,
    completedSession: await getReadinessSession(sessionToken)
  };
}

const ALL_LOWEST_PATH = [
  { questionId: QUESTION_1.id, optionId: QUESTION_1.options[4].id },
  { questionId: QUESTION_2.id, optionId: QUESTION_2.options[0].id },
  { questionId: QUESTION_3.id, optionId: QUESTION_3.options[0].id },
  { questionId: QUESTION_4.id, optionId: QUESTION_4.options[4].id },
  { questionId: QUESTION_5.id, optionId: QUESTION_5.options[0].id },
  { questionId: QUESTION_6.id, optionId: QUESTION_6.options[0].id },
  { questionId: QUESTION_7.id, optionId: QUESTION_7.options[0].id }
];

const ALL_HIGHEST_PATH = [
  { questionId: QUESTION_1.id, optionId: QUESTION_1.options[0].id },
  { questionId: QUESTION_2.id, optionId: QUESTION_2.options[2].id },
  { questionId: QUESTION_3.id, optionId: QUESTION_3.options[4].id },
  { questionId: QUESTION_4.id, optionId: QUESTION_4.options[0].id },
  { questionId: QUESTION_5.id, optionId: QUESTION_5.options[3].id },
  { questionId: QUESTION_6.id, optionId: QUESTION_6.options[3].id },
  { questionId: QUESTION_7.id, optionId: QUESTION_7.options[4].id }
];

const MID_BAND_PATH = [
  { questionId: QUESTION_1.id, optionId: QUESTION_1.options[2].id },
  { questionId: QUESTION_2.id, optionId: QUESTION_2.options[1].id },
  { questionId: QUESTION_3.id, optionId: QUESTION_3.options[2].id },
  { questionId: QUESTION_4.id, optionId: QUESTION_4.options[2].id },
  { questionId: QUESTION_5.id, optionId: QUESTION_5.options[2].id },
  { questionId: QUESTION_6.id, optionId: QUESTION_6.options[2].id },
  { questionId: QUESTION_7.id, optionId: QUESTION_7.options[1].id }
];

describe('POST /api/readiness-check/answer contract', () => {
  beforeEach(async () => {
    await resetReadinessSessionStoreForTests();
  });

  it('returns a success envelope for the first valid answer submission', async () => {
    await seedInProgressSession();

    const { response, payload } = await invokeAnswer({
      sessionToken: VALID_SESSION_TOKEN,
      questionId: QUESTION_1.id,
      optionId: QUESTION_1.options[0].id
    });

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      answeredCount: 1,
      isComplete: false
    });
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR for a missing session token', async () => {
    const { response, payload } = await invokeAnswer({
      questionId: QUESTION_1.id,
      optionId: QUESTION_1.options[0].id
    });

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expectMeta(payload.meta);
  });

  it('returns 404 NOT_FOUND for an unknown session token with valid shape', async () => {
    const { response, payload } = await invokeAnswer({
      sessionToken: UNKNOWN_SESSION_TOKEN,
      questionId: QUESTION_1.id,
      optionId: QUESTION_1.options[0].id
    });

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'NOT_FOUND' });
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR for an invalid question and option pairing', async () => {
    await seedInProgressSession();

    const { response, payload } = await invokeAnswer({
      sessionToken: VALID_SESSION_TOKEN,
      questionId: QUESTION_1.id,
      optionId: QUESTION_2.options[0].id
    });

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expectMeta(payload.meta);
  });

  it('treats a duplicate submission of the same tuple as idempotent', async () => {
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

    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    expect(first.payload.data.answeredCount).toBe(1);
    expect(second.payload.data.answeredCount).toBe(1);
    expect(second.payload.data.isComplete).toBe(false);
    expectMeta(first.payload.meta);
    expectMeta(second.payload.meta);
  });

  it('returns 409 CONFLICT when the answer changes for an already answered question', async () => {
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
    expect(second.payload.success).toBe(false);
    expect(second.payload.error).toMatchObject({ code: 'CONFLICT' });
    expectMeta(second.payload.meta);
  });

  it('marks the 7th unique answer complete and persists the completed session state', async () => {
    await seedInProgressSession();

    const { responses, completedSession } = await submitAnswers(VALID_SESSION_TOKEN, ALL_LOWEST_PATH);
    const finalResponse = responses[responses.length - 1];

    expect(finalResponse?.response.status).toBe(200);
    expect(finalResponse?.payload.success).toBe(true);
    expect(finalResponse?.payload.data).toMatchObject({
      answeredCount: 7,
      isComplete: true
    });
    expectMeta(finalResponse?.payload.meta);

    expect(completedSession).toMatchObject({
      sessionToken: VALID_SESSION_TOKEN,
      status: 'completed',
      resultCategory: 'early_stage',
      resultScore: 0
    });
    expect(typeof completedSession?.completedAt).toBe('string');
    expect(String(completedSession?.completedAt)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it.each([
    {
      name: 'all-lowest path',
      answers: ALL_LOWEST_PATH,
      expectedCategory: 'early_stage' as const,
      expectedScore: 0
    },
    {
      name: 'all-highest path',
      answers: ALL_HIGHEST_PATH,
      expectedCategory: 'ready_to_scale' as const,
      expectedScore: 100
    },
    {
      name: 'mid-band path',
      answers: MID_BAND_PATH,
      expectedCategory: 'ready_to_pilot' as const,
      expectedScoreRange: [50, 74] as const
    }
  ])('stores the correct completion band for the %s', async ({ answers, expectedCategory, expectedScore, expectedScoreRange }) => {
    await seedInProgressSession();

    const { completedSession } = await submitAnswers(VALID_SESSION_TOKEN, answers);

    expect(completedSession).toMatchObject({
      sessionToken: VALID_SESSION_TOKEN,
      status: 'completed',
      resultCategory: expectedCategory
    });
    expect(typeof completedSession?.completedAt).toBe('string');

    if (typeof expectedScore === 'number') {
      expect(completedSession?.resultScore).toBe(expectedScore);
    }

    if (expectedScoreRange) {
      expect(completedSession?.resultScore).toBeGreaterThanOrEqual(expectedScoreRange[0]);
      expect(completedSession?.resultScore).toBeLessThanOrEqual(expectedScoreRange[1]);
    }
  });
});
