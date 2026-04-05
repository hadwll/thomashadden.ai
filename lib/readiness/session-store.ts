export const READINESS_TOTAL_QUESTIONS = 7 as const;

export type ReadinessSessionStatus = 'in_progress' | 'abandoned' | 'completed';

export type ReadinessResultCategory = 'early_stage' | 'foundational' | 'ready_to_pilot' | 'ready_to_scale';

export type ReadinessAnswerRecord = {
  questionId: string;
  questionOrder: number;
  questionIndex: number;
  optionId: string;
  scoreValue: number;
  answeredAt: string;
};

export type ReadinessSessionRecord = {
  sessionToken: string;
  status: ReadinessSessionStatus;
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: typeof READINESS_TOTAL_QUESTIONS;
  startedAt: string;
  answersByQuestionId: Record<string, ReadinessAnswerRecord>;
  resultScore?: number;
  resultCategory?: ReadinessResultCategory;
  completedAt?: string;
};

export type ReadinessSessionSeed = {
  sessionToken: string;
  status?: ReadinessSessionStatus;
  answeredQuestions?: number[];
  nextQuestionIndex?: number;
  totalQuestions?: number;
  startedAt?: string;
  answersByQuestionId?: Record<string, ReadinessAnswerRecord>;
  resultScore?: number;
  resultCategory?: ReadinessResultCategory;
  completedAt?: string;
};

export type ReadinessAnswerInput = {
  questionId: string;
  questionOrder: number;
  optionId: string;
  scoreValue: number;
};

export type ReadinessAnswerWriteResult =
  | {
      kind: 'recorded';
      session: ReadinessSessionRecord;
    }
  | {
      kind: 'duplicate';
      session: ReadinessSessionRecord;
    }
  | {
      kind: 'conflict';
      session: ReadinessSessionRecord;
    }
  | {
      kind: 'missing';
      session: null;
    };

const globalForReadiness = globalThis as typeof globalThis & {
  __readinessSessionStore__?: Map<string, ReadinessSessionRecord>;
  __readinessSessionStoreCleanupRegistered__?: boolean;
};

// Route handlers are bundled separately, so the store must live on `globalThis`
// to stay visible across `/session`, `/answer`, `/result`, and auth-linking calls.
const readinessSessionStore =
  globalForReadiness.__readinessSessionStore__ ??
  (globalForReadiness.__readinessSessionStore__ = new Map<string, ReadinessSessionRecord>());

const globalForTestCleanup = globalForReadiness;

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

function normalizeAnswerRecords(
  answersByQuestionId: unknown
): Record<string, ReadinessAnswerRecord> {
  if (!answersByQuestionId || typeof answersByQuestionId !== 'object' || Array.isArray(answersByQuestionId)) {
    return {};
  }

  const nextAnswers: Record<string, ReadinessAnswerRecord> = {};

  for (const [questionId, answer] of Object.entries(answersByQuestionId as Record<string, unknown>)) {
    if (!answer || typeof answer !== 'object') {
      continue;
    }

    const record = answer as Partial<ReadinessAnswerRecord>;
    if (
      typeof record.questionId !== 'string' ||
      typeof record.questionOrder !== 'number' ||
      typeof record.questionIndex !== 'number' ||
      typeof record.optionId !== 'string' ||
      typeof record.scoreValue !== 'number' ||
      typeof record.answeredAt !== 'string'
    ) {
      continue;
    }

    nextAnswers[questionId] = {
      questionId: record.questionId,
      questionOrder: record.questionOrder,
      questionIndex: record.questionIndex,
      optionId: record.optionId,
      scoreValue: record.scoreValue,
      answeredAt: record.answeredAt
    };
  }

  return nextAnswers;
}

function normalizeResultCategory(resultCategory: unknown): ReadinessResultCategory | undefined {
  if (
    resultCategory === 'early_stage' ||
    resultCategory === 'foundational' ||
    resultCategory === 'ready_to_pilot' ||
    resultCategory === 'ready_to_scale'
  ) {
    return resultCategory;
  }

  return undefined;
}

function createDefaultSession(sessionToken: string, startedAt = new Date().toISOString()): ReadinessSessionRecord {
  return {
    sessionToken,
    status: 'in_progress',
    answeredQuestions: [],
    nextQuestionIndex: 0,
    totalQuestions: READINESS_TOTAL_QUESTIONS,
    startedAt,
    answersByQuestionId: {}
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

export function createReadinessSession(sessionToken: string): ReadinessSessionRecord {
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

export function getReadinessAnswerForQuestion(
  session: ReadinessSessionRecord,
  questionId: string
): ReadinessAnswerRecord | null {
  return session.answersByQuestionId[questionId] ?? null;
}

export function countReadinessAnsweredQuestions(session: ReadinessSessionRecord): number {
  return Object.keys(session.answersByQuestionId).length;
}

export function recordReadinessAnswer(
  sessionToken: string,
  answer: ReadinessAnswerInput
): ReadinessAnswerWriteResult {
  const existingSession = readinessSessionStore.get(sessionToken);
  if (!existingSession) {
    return {
      kind: 'missing',
      session: null
    };
  }

  const existingAnswer = existingSession.answersByQuestionId[answer.questionId];
  if (existingAnswer) {
    if (existingAnswer.optionId === answer.optionId) {
      return {
        kind: 'duplicate',
        session: existingSession
      };
    }

    return {
      kind: 'conflict',
      session: existingSession
    };
  }

  if (existingSession.status !== 'in_progress') {
    return {
      kind: 'conflict',
      session: existingSession
    };
  }

  const questionIndex = Math.max(0, answer.questionOrder - 1);
  const nextAnsweredQuestions = Array.from(
    new Set([...existingSession.answeredQuestions, questionIndex])
  ).sort((left, right) => left - right);

  const nextSession: ReadinessSessionRecord = {
    ...existingSession,
    answeredQuestions: nextAnsweredQuestions,
    nextQuestionIndex: nextAnsweredQuestions.length,
    answersByQuestionId: {
      ...existingSession.answersByQuestionId,
      [answer.questionId]: {
        questionId: answer.questionId,
        questionOrder: answer.questionOrder,
        questionIndex,
        optionId: answer.optionId,
        scoreValue: answer.scoreValue,
        answeredAt: new Date().toISOString()
      }
    }
  };

  readinessSessionStore.set(sessionToken, nextSession);

  return {
    kind: 'recorded',
    session: nextSession
  };
}

export function finaliseReadinessSessionCompletion(
  sessionToken: string,
  resultScore: number,
  resultCategory: ReadinessResultCategory,
  completedAt = new Date().toISOString()
): ReadinessSessionRecord | null {
  const existingSession = readinessSessionStore.get(sessionToken);
  if (!existingSession) {
    return null;
  }

  const nextSession: ReadinessSessionRecord = {
    ...existingSession,
    status: 'completed',
    resultScore,
    resultCategory,
    completedAt,
    nextQuestionIndex: READINESS_TOTAL_QUESTIONS
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
  const answeredQuestions = normalizeAnsweredQuestions(seed.answeredQuestions);
  const answersByQuestionId = normalizeAnswerRecords(seed.answersByQuestionId);
  const normalisedResultCategory = normalizeResultCategory(seed.resultCategory);

  const nextSession: ReadinessSessionRecord = {
    sessionToken: seed.sessionToken,
    status: seed.status ?? 'in_progress',
    answeredQuestions,
    nextQuestionIndex: isFiniteInteger(seed.nextQuestionIndex) ? seed.nextQuestionIndex : answeredQuestions.length,
    totalQuestions: READINESS_TOTAL_QUESTIONS,
    startedAt: seed.startedAt ?? new Date().toISOString(),
    answersByQuestionId,
    ...(typeof seed.resultScore === 'number' ? { resultScore: seed.resultScore } : {}),
    ...(normalisedResultCategory ? { resultCategory: normalisedResultCategory } : {}),
    ...(typeof seed.completedAt === 'string' ? { completedAt: seed.completedAt } : {})
  };

  readinessSessionStore.set(nextSession.sessionToken, nextSession);
  return nextSession;
}
