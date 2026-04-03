import { NextResponse } from 'next/server';
import {
  getReadinessSession,
  type ReadinessResultCategory,
  type ReadinessSessionRecord
} from '@/lib/readiness/session-store';
import { calculateReadinessRawScore, getReadinessCategory, normaliseReadinessScore } from '@/lib/readiness/scoring';
import { createClient } from '@/lib/supabase/server';

type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHORISED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';

type ReadinessSessionWithLink = ReadinessSessionRecord & {
  user_id?: string | null;
};

type ReadinessResultData = {
  resultId: string;
  category: ReadinessResultCategory;
  categoryLabel: string;
  score: number;
  summary: string;
  nextStep: string;
  cta: {
    label: string;
    url: string;
  };
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESULT_DETAILS: Record<
  ReadinessResultCategory,
  {
    categoryLabel: string;
    summary: string;
    nextStep: string;
    ctaLabel: string;
    ctaUrl: string;
  }
> = {
  early_stage: {
    categoryLabel: 'Early-Stage',
    summary:
      "Your business is at the beginning of the AI journey - and that's completely normal. Most businesses are. The good news is that starting with a clear picture of where you are is exactly the right first move. AI doesn't have to be complicated or expensive to be useful, and there are practical starting points that don't require a major investment or a technical team.",
    nextStep:
      'A short conversation about your business and the areas where you are feeling the most pressure is the best place to start. No jargon, no sales pitch - just a practical look at what might be possible.',
    ctaLabel: 'Start with a conversation - get in touch',
    ctaUrl: '/contact?source=readiness_check&result=early_stage'
  },
  foundational: {
    categoryLabel: 'Foundational',
    summary:
      'Your business has the building blocks in place. You are aware of AI, you have some data to work with, and you are open to exploring what is possible. The gap between where you are now and a meaningful first AI application is smaller than you might think. The key is identifying the right use case - one that fits your existing operations and delivers visible value quickly.',
    nextStep:
      "It is worth mapping your current processes against a few targeted AI opportunities. That's a conversation that usually takes an hour and produces a clear picture of where to focus first.",
    ctaLabel: "Explore what's possible - get in touch",
    ctaUrl: '/contact?source=readiness_check&result=foundational'
  },
  ready_to_pilot: {
    categoryLabel: 'Ready to Pilot',
    summary:
      'You are in a strong position. Your business has real data, identified pain points, and the appetite to move forward. A focused AI pilot - something scoped, measurable, and low-risk - is a realistic and sensible next step. Businesses at this stage typically see results within weeks rather than months when the right use case is chosen and the implementation is kept tight.',
    nextStep:
      'The next step is scoping a pilot that fits your business specifically. That means identifying the right process, the right data, and the right success criteria before any work begins.',
    ctaLabel: "Let's identify your first use case - get in touch",
    ctaUrl: '/contact?source=readiness_check&result=ready_to_pilot'
  },
  ready_to_scale: {
    categoryLabel: 'Ready to Scale',
    summary:
      "Your business is ahead of the curve. You are already using data and, in some areas, AI - and you have the infrastructure and appetite to go further. The opportunity now is to move from isolated applications to a more joined-up approach: connecting your data sources, building on what is working, and identifying where AI can compound the value you are already creating.",
    nextStep:
      'A conversation about your current AI landscape and where the highest-value opportunities sit next is a worthwhile hour. The focus at this stage is usually on integration, automation pipelines, and scaling what is already proving its worth.',
    ctaLabel: "Let's talk about scaling - get in touch",
    ctaUrl: '/contact?source=readiness_check&result=ready_to_scale'
  }
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

function ok(data: ReadinessResultData) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: createMeta()
    },
    { status: 200 }
  );
}

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const supabase = createClient(request);
  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    return null;
  }

  const userId = data.session?.user?.id;
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return null;
  }

  return userId;
}

function deriveResultScore(session: ReadinessSessionWithLink): number | null {
  if (typeof session.resultScore === 'number' && Number.isFinite(session.resultScore)) {
    return Math.max(0, Math.min(100, Math.round(session.resultScore)));
  }

  const answerScores = Object.values(session.answersByQuestionId ?? {}).map((answer) => answer.scoreValue);
  if (answerScores.length !== 7 || answerScores.some((score) => typeof score !== 'number' || !Number.isFinite(score))) {
    return null;
  }

  const rawScore = calculateReadinessRawScore(answerScores);
  return Math.max(0, Math.min(100, Math.round(normaliseReadinessScore(rawScore))));
}

function deriveResultCategory(session: ReadinessSessionWithLink, score: number): ReadinessResultCategory {
  const storedCategory = session.resultCategory;
  if (
    storedCategory === 'early_stage' ||
    storedCategory === 'foundational' ||
    storedCategory === 'ready_to_pilot' ||
    storedCategory === 'ready_to_scale'
  ) {
    return storedCategory;
  }

  return getReadinessCategory(score);
}

function buildResultPayload(sessionToken: string, session: ReadinessSessionWithLink): ReadinessResultData | null {
  const score = deriveResultScore(session);
  if (score === null) {
    return null;
  }

  const category = deriveResultCategory(session, score);
  const details = RESULT_DETAILS[category];

  return {
    resultId: `result_${sessionToken}`,
    category,
    categoryLabel: details.categoryLabel,
    score,
    summary: details.summary,
    nextStep: details.nextStep,
    cta: {
      label: details.ctaLabel,
      url: details.ctaUrl
    }
  };
}

type RouteContext = {
  params: {
    token: string;
  };
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return error(401, 'UNAUTHORISED', 'You need to sign in to view your readiness result.');
    }

    const token = context.params.token;
    if (typeof token !== 'string' || !UUID_REGEX.test(token)) {
      return error(422, 'VALIDATION_ERROR', 'Path token failed validation.', {
        field: 'token',
        reason: 'token must be a valid UUID.'
      });
    }

    const session = (await getReadinessSession(token)) as ReadinessSessionWithLink | null;
    if (!session || session.status !== 'completed') {
      return error(404, 'NOT_FOUND', 'Requested readiness result is not ready yet.');
    }

    const linkedUserId = typeof session.user_id === 'string' && session.user_id.trim().length > 0 ? session.user_id : null;
    if (!linkedUserId || linkedUserId !== userId) {
      return error(403, 'FORBIDDEN', 'This assessment is linked to a different account.');
    }

    const payload = buildResultPayload(token, session);
    if (!payload) {
      return error(404, 'NOT_FOUND', 'Requested readiness result is not ready yet.');
    }

    return ok(payload);
  } catch {
    return error(500, 'INTERNAL_ERROR', 'An internal error occurred while loading the readiness result.');
  }
}
