export const READINESS_TOTAL_QUESTIONS = 7 as const;

export type ReadinessSessionStatus = 'in_progress' | 'abandoned';

export type ReadinessSessionRecord = {
  sessionToken: string;
  status: ReadinessSessionStatus;
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: typeof READINESS_TOTAL_QUESTIONS;
  startedAt: string;
};

export type ReadinessSessionSeed = {
  sessionToken: string;
  status?: ReadinessSessionStatus;
  answeredQuestions?: number[];
  nextQuestionIndex?: number;
  totalQuestions?: number;
  startedAt?: string;
};

const readinessSessionStore = new Map<string, ReadinessSessionRecord>();
const globalForTestCleanup = globalThis as typeof globalThis & {
  __readinessSessionStoreCleanupRegistered__?: boolean;
};

if (process.env.NODE_ENV === 'test' && typeof afterEach === 'function' && !globalForTestCleanup.__readinessSessionStoreCleanupRegistered__) {
  afterEach(() => {
    readinessSessionStore.clear();
  });

  globalForTestCleanup.__readinessSessionStoreCleanupRegistered__ = true;
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
}

function normalizeAnsweredQuestions(answeredQuestions: unknown): number[] {
  if (!Array.isArray(answeredQuestions)) {
    return [];
  }

  return answeredQuestions.filter(isFiniteInteger);
}

function createDefaultSession(sessionToken: string, startedAt = new Date().toISOString()): ReadinessSessionRecord {
  return {
    sessionToken,
    status: 'in_progress',
    answeredQuestions: [],
    nextQuestionIndex: 0,
    totalQuestions: READINESS_TOTAL_QUESTIONS,
    startedAt
  };
}

export function createOrGetReadinessSession(sessionToken: string): ReadinessSessionRecord {
  const existingSession = readinessSessionStore.get(sessionToken);
  if (existingSession) {
    return existingSession;
  }

  const nextSession = createDefaultSession(sessionToken);
  readinessSessionStore.set(sessionToken, nextSession);
  return nextSession;
}

export function getOrCreateReadinessSession(sessionToken: string): ReadinessSessionRecord {
  return createOrGetReadinessSession(sessionToken);
}

export function getReadinessSession(sessionToken: string): ReadinessSessionRecord | null {
  const existingSession = readinessSessionStore.get(sessionToken);
  if (existingSession) {
    return existingSession;
  }

  return null;
}

export function fetchReadinessSession(sessionToken: string): ReadinessSessionRecord | null {
  return getReadinessSession(sessionToken);
}

export function markReadinessSessionAbandoned(sessionToken: string): ReadinessSessionRecord | null {
  const existingSession = readinessSessionStore.get(sessionToken);
  if (!existingSession) {
    return null;
  }

  if (existingSession.status === 'abandoned') {
    return existingSession;
  }

  const nextSession: ReadinessSessionRecord = {
    ...existingSession,
    status: 'abandoned'
  };
  readinessSessionStore.set(sessionToken, nextSession);
  return nextSession;
}

export function isReadinessSessionStale(session: ReadinessSessionRecord, now = Date.now()): boolean {
  if (session.status !== 'in_progress') {
    return false;
  }

  const startedAtMs = Date.parse(session.startedAt);
  if (!Number.isFinite(startedAtMs)) {
    return false;
  }

  const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
  // Aged unfinished sessions older than 30 days are treated as abandoned in this slice.
  return now - startedAtMs >= STALE_AFTER_MS;
}

export function resetReadinessSessionStoreForTests(): void {
  readinessSessionStore.clear();
}

export function seedReadinessSessionForTests(seed: ReadinessSessionSeed): ReadinessSessionRecord {
  const nextSession: ReadinessSessionRecord = {
    sessionToken: seed.sessionToken,
    status: seed.status ?? 'in_progress',
    answeredQuestions: normalizeAnsweredQuestions(seed.answeredQuestions),
    nextQuestionIndex: isFiniteInteger(seed.nextQuestionIndex) ? seed.nextQuestionIndex : 0,
    totalQuestions: READINESS_TOTAL_QUESTIONS,
    startedAt: seed.startedAt ?? new Date().toISOString()
  };

  readinessSessionStore.set(nextSession.sessionToken, nextSession);
  return nextSession;
}
