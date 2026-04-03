import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/readiness-check/session/[token]/route';
import { POST } from '@/app/api/readiness-check/session/route';
import {
  getReadinessSession,
  READINESS_TOTAL_QUESTIONS,
  resetReadinessSessionStoreForTests,
  seedReadinessSessionForTests
} from '@/lib/readiness/session-store';

const VALID_SESSION_TOKEN = '11111111-1111-4111-8111-111111111111';
const UNKNOWN_SESSION_TOKEN = '22222222-2222-4222-8222-222222222222';
const STALE_SESSION_TOKEN = '33333333-3333-4333-8333-333333333333';
const FRESH_SESSION_TOKEN = '44444444-4444-4444-8444-444444444444';
const COMPLETED_SESSION_TOKEN = '55555555-5555-4555-8555-555555555555';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function createPostRequest(sessionToken: unknown) {
  return new Request('http://localhost/api/readiness-check/session', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ sessionToken })
  });
}

function createGetRequest(token: string) {
  return new Request(`http://localhost/api/readiness-check/session/${token}`, {
    method: 'GET'
  });
}

async function invokeCreateSession(sessionToken: unknown) {
  const response = await POST(createPostRequest(sessionToken));
  const payload = (await response.json()) as Record<string, unknown>;

  return { response, payload };
}

async function invokeGetSession(token: string) {
  const response = await GET(createGetRequest(token), { params: { token } });
  const payload = (await response.json()) as Record<string, unknown>;

  return { response, payload };
}

function expectMeta(meta: unknown) {
  const maybeMeta = meta as { requestId?: unknown; timestamp?: unknown };

  expect(typeof maybeMeta.requestId).toBe('string');
  expect(typeof maybeMeta.timestamp).toBe('string');
}

describe('readiness session contract lock', () => {
  beforeEach(() => {
    resetReadinessSessionStoreForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));
  });

  afterEach(() => {
    resetReadinessSessionStoreForTests();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('treats repeated POSTs for the same valid sessionToken as idempotent without drifting the stored session state', async () => {
    const first = await invokeCreateSession(VALID_SESSION_TOKEN);
    const firstSession = getReadinessSession(VALID_SESSION_TOKEN);

    const second = await invokeCreateSession(VALID_SESSION_TOKEN);
    const secondSession = getReadinessSession(VALID_SESSION_TOKEN);

    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    expect(first.payload).toMatchObject({
      success: true,
      data: {
        sessionToken: VALID_SESSION_TOKEN,
        status: 'in_progress',
        totalQuestions: READINESS_TOTAL_QUESTIONS
      }
    });
    expect(second.payload).toMatchObject({
      success: true,
      data: {
        sessionToken: VALID_SESSION_TOKEN,
        status: 'in_progress',
        totalQuestions: READINESS_TOTAL_QUESTIONS
      }
    });
    expect(first.payload.data).toEqual(second.payload.data);
    expect(firstSession?.sessionToken).toBe(VALID_SESSION_TOKEN);
    expect(secondSession).toBe(firstSession);
    expect(secondSession?.startedAt).toBe(firstSession?.startedAt);
    expectMeta(first.payload.meta);
    expectMeta(second.payload.meta);
  });

  it('returns 422 VALIDATION_ERROR when session creation receives a malformed sessionToken', async () => {
    const { response, payload } = await invokeCreateSession('not-a-uuid');

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body failed validation.',
        details: {
          field: 'sessionToken',
          reason: 'sessionToken must be a valid UUID.'
        }
      }
    });
    expectMeta(payload.meta);
  });

  it('returns 404 NOT_FOUND for a missing readiness session token that still has valid UUID shape', async () => {
    const { response, payload } = await invokeGetSession(UNKNOWN_SESSION_TOKEN);

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

  it('marks an unfinished session as abandoned exactly at the 30-day stale boundary', async () => {
    await seedReadinessSessionForTests({
      sessionToken: STALE_SESSION_TOKEN,
      status: 'in_progress',
      answeredQuestions: [0, 1, 2],
      nextQuestionIndex: 3,
      totalQuestions: READINESS_TOTAL_QUESTIONS,
      startedAt: new Date(Date.now() - THIRTY_DAYS_MS).toISOString()
    });

    const { response, payload } = await invokeGetSession(STALE_SESSION_TOKEN);
    const storedSession = getReadinessSession(STALE_SESSION_TOKEN);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        sessionToken: STALE_SESSION_TOKEN,
        status: 'abandoned',
        answeredQuestions: [0, 1, 2],
        nextQuestionIndex: 3,
        totalQuestions: READINESS_TOTAL_QUESTIONS
      }
    });
    expect(storedSession?.status).toBe('abandoned');
    expect(storedSession?.answeredQuestions).toEqual([0, 1, 2]);
    expect(storedSession?.nextQuestionIndex).toBe(3);
    expectMeta(payload.meta);
  });

  it('keeps a non-stale in-progress session resumable instead of abandoning it', async () => {
    await seedReadinessSessionForTests({
      sessionToken: FRESH_SESSION_TOKEN,
      status: 'in_progress',
      answeredQuestions: [0, 1],
      nextQuestionIndex: 2,
      totalQuestions: READINESS_TOTAL_QUESTIONS,
      startedAt: new Date(Date.now() - (THIRTY_DAYS_MS - 1)).toISOString()
    });

    const { response, payload } = await invokeGetSession(FRESH_SESSION_TOKEN);
    const storedSession = getReadinessSession(FRESH_SESSION_TOKEN);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        sessionToken: FRESH_SESSION_TOKEN,
        status: 'in_progress',
        answeredQuestions: [0, 1],
        nextQuestionIndex: 2,
        totalQuestions: READINESS_TOTAL_QUESTIONS
      }
    });
    expect(storedSession?.status).toBe('in_progress');
    expect(storedSession?.answeredQuestions).toEqual([0, 1]);
    expect(storedSession?.nextQuestionIndex).toBe(2);
    expectMeta(payload.meta);
  });

  it('never downgrades a completed session to abandoned when the stale rule runs', async () => {
    await seedReadinessSessionForTests({
      sessionToken: COMPLETED_SESSION_TOKEN,
      status: 'completed',
      answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
      nextQuestionIndex: READINESS_TOTAL_QUESTIONS,
      totalQuestions: READINESS_TOTAL_QUESTIONS,
      startedAt: new Date(Date.now() - (THIRTY_DAYS_MS * 2)).toISOString()
    });

    const { response, payload } = await invokeGetSession(COMPLETED_SESSION_TOKEN);
    const storedSession = getReadinessSession(COMPLETED_SESSION_TOKEN);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        sessionToken: COMPLETED_SESSION_TOKEN,
        status: 'completed',
        answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
        nextQuestionIndex: READINESS_TOTAL_QUESTIONS,
        totalQuestions: READINESS_TOTAL_QUESTIONS
      }
    });
    expect(storedSession?.status).toBe('completed');
    expect(storedSession?.nextQuestionIndex).toBe(READINESS_TOTAL_QUESTIONS);
    expectMeta(payload.meta);
  });
});
