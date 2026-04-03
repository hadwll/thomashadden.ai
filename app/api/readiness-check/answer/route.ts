import { NextResponse } from 'next/server';
import { READINESS_QUESTION_SET, getReadinessOptionScore, getReadinessQuestionById } from '@/lib/readiness/question-set';
import { calculateReadinessRawScore, getReadinessCategory, normaliseReadinessScore } from '@/lib/readiness/scoring';
import { getReadinessSession } from '@/lib/readiness/session-store';

type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReadinessAnswerRecord = {
  questionId: string;
  questionOrder: number;
  questionIndex: number;
  optionId: string;
  scoreValue: number;
  answeredAt: string;
};

type MutableReadinessSession = {
  sessionToken: string;
  status: 'in_progress' | 'abandoned' | 'completed';
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: number;
  startedAt?: string;
  answersByQuestionId?: Record<string, ReadinessAnswerRecord>;
  resultScore?: number;
  resultCategory?: string;
  completedAt?: string;
};

function createMeta() {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    requestId,
    timestamp: new Date().toISOString()
  };
}

function error(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      },
      meta: createMeta()
    },
    { status }
  );
}

function ok(data: { answeredCount: number; isComplete: boolean }) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: createMeta()
    },
    { status: 200 }
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getMutableAnswerMap(session: MutableReadinessSession): Record<string, ReadinessAnswerRecord> {
  if (!session.answersByQuestionId) {
    session.answersByQuestionId = {};
  }

  return session.answersByQuestionId;
}

function getAnsweredCount(session: MutableReadinessSession): number {
  return Object.keys(getMutableAnswerMap(session)).length;
}

function updateAnsweredQuestions(session: MutableReadinessSession, questionIndex: number) {
  const nextAnsweredQuestions = Array.from(new Set([...(session.answeredQuestions ?? []), questionIndex])).sort(
    (left, right) => left - right
  );

  session.answeredQuestions = nextAnsweredQuestions;
  session.nextQuestionIndex = nextAnsweredQuestions.length;
}

function finaliseSession(session: MutableReadinessSession, completedAt: string, resultScore: number, resultCategory: string) {
  session.status = 'completed';
  session.resultScore = resultScore;
  session.resultCategory = resultCategory;
  session.completedAt = completedAt;
  session.nextQuestionIndex = READINESS_QUESTION_SET.totalQuestions;
}

export async function POST(request: Request) {
  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'body',
        reason: 'Malformed JSON body.'
      });
    }

    if (!isObjectRecord(payload)) {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'body',
        reason: 'Body must be a JSON object.'
      });
    }

    if (typeof payload.sessionToken !== 'string' || !UUID_REGEX.test(payload.sessionToken)) {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'sessionToken',
        reason: 'sessionToken must be a valid UUID.'
      });
    }

    if (typeof payload.questionId !== 'string' || payload.questionId.length === 0) {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'questionId',
        reason: 'questionId must be a non-empty string.'
      });
    }

    if (typeof payload.optionId !== 'string' || payload.optionId.length === 0) {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'optionId',
        reason: 'optionId must be a non-empty string.'
      });
    }

    const question = getReadinessQuestionById(payload.questionId);
    if (!question) {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'questionId',
        reason: 'questionId does not belong to the active readiness question set.'
      });
    }

    const scoreValue = getReadinessOptionScore(question.id, payload.optionId);
    if (scoreValue === null) {
      return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'optionId',
        reason: 'optionId does not belong to the specified question.'
      });
    }

    const session = (await getReadinessSession(payload.sessionToken)) as MutableReadinessSession | null;
    if (!session) {
      return error(404, 'NOT_FOUND', 'Requested readiness session was not found.');
    }

    const answerMap = getMutableAnswerMap(session);
    const existingAnswer = answerMap[question.id];

    if (existingAnswer) {
      if (existingAnswer.optionId !== payload.optionId) {
        return error(409, 'CONFLICT', 'Answer already recorded for this question.');
      }

      return ok({
        answeredCount: getAnsweredCount(session),
        isComplete: session.status === 'completed'
      });
    }

    if (session.status !== 'in_progress') {
      return error(409, 'CONFLICT', 'Readiness session is no longer accepting answers.');
    }

    const questionIndex = question.order - 1;
    answerMap[question.id] = {
      questionId: question.id,
      questionOrder: question.order,
      questionIndex,
      optionId: payload.optionId,
      scoreValue,
      answeredAt: new Date().toISOString()
    };

    updateAnsweredQuestions(session, questionIndex);

    const answeredCount = getAnsweredCount(session);
    if (answeredCount < READINESS_QUESTION_SET.totalQuestions) {
      return ok({
        answeredCount,
        isComplete: false
      });
    }

    const selectedScores = READINESS_QUESTION_SET.questions.map((questionItem) => {
      const answer = answerMap[questionItem.id];
      if (!answer) {
        throw new Error('Complete readiness answer set is missing one or more question responses.');
      }

      return answer.scoreValue;
    });

    const rawScore = calculateReadinessRawScore(selectedScores);
    const normalisedScore = normaliseReadinessScore(rawScore);
    const category = getReadinessCategory(normalisedScore);
    const completedAt = new Date().toISOString();

    finaliseSession(session, completedAt, normalisedScore, category);

    return ok({
      answeredCount,
      isComplete: true
    });
  } catch {
    return error(500, 'INTERNAL_ERROR', 'An internal error occurred while recording the readiness answer.');
  }
}
