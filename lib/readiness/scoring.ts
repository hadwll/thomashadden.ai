import { getReadinessOptionScore } from '@/lib/readiness/question-set';

const READINESS_MIN_RAW_SCORE = 7;
const READINESS_MAX_RAW_SCORE = 28;
const READINESS_TOTAL_ANSWERS = 7;

export type ReadinessCategory = 'early_stage' | 'foundational' | 'ready_to_pilot' | 'ready_to_scale';

function isScoreValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function calculateReadinessRawScore(answeredOptionIdsOrScores: ReadonlyArray<number | string>): number {
  if (answeredOptionIdsOrScores.length !== READINESS_TOTAL_ANSWERS) {
    throw new Error('A complete seven-answer set is required before scoring.');
  }

  return answeredOptionIdsOrScores.reduce((total, entry) => {
    if (isScoreValue(entry)) {
      return total + entry;
    }

    if (typeof entry === 'string') {
      const scoreValue = getReadinessOptionScoreForAnyQuestion(entry);
      if (scoreValue === null) {
        throw new Error(`Unknown readiness option id: ${entry}`);
      }

      return total + scoreValue;
    }

    throw new Error('Each readiness answer must be a score value or option id.');
  }, 0);
}

function getReadinessOptionScoreForAnyQuestion(optionId: string): number | null {
  const questionIds = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'] as const;

  for (const questionId of questionIds) {
    const scoreValue = getReadinessOptionScore(questionId, optionId);
    if (scoreValue !== null) {
      return scoreValue;
    }
  }

  return null;
}

export function normaliseReadinessScore(rawScore: number): number {
  if (!isScoreValue(rawScore)) {
    throw new Error('Readiness raw score must be a finite number.');
  }

  return Math.round(((rawScore - READINESS_MIN_RAW_SCORE) / (READINESS_MAX_RAW_SCORE - READINESS_MIN_RAW_SCORE)) * 100);
}

export function getReadinessCategory(normalisedScore: number): ReadinessCategory {
  if (normalisedScore <= 24) {
    return 'early_stage';
  }

  if (normalisedScore <= 49) {
    return 'foundational';
  }

  if (normalisedScore <= 74) {
    return 'ready_to_pilot';
  }

  return 'ready_to_scale';
}
