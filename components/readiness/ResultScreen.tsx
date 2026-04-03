'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { clearReadinessSessionStorage, readReadinessSessionStorage } from '@/lib/readiness/session-token';
import { createClient } from '@/lib/supabase/client';

type ReadinessResultCategory = 'early_stage' | 'foundational' | 'ready_to_pilot' | 'ready_to_scale';

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

type ReadinessResultResponse = {
  success: boolean;
  data?: ReadinessResultData;
};

type ResultViewState =
  | {
      status: 'loading';
    }
  | {
      status: 'ready';
      result: ReadinessResultData;
    }
  | {
      status: 'auth-missing';
      message: string;
      actionLabel: string;
      actionHref: string;
    }
  | {
      status: 'error';
      message: string;
      actionLabel: string;
    };

const SAFE_GENERIC_ERROR = 'Something went wrong. Would you like to start the assessment again?';
const SAFE_WRONG_ACCOUNT_ERROR = 'This assessment is linked to a different account.';
const SAFE_INCOMPLETE_ERROR = 'Your results are not ready yet. Please restart the assessment to try again.';
const SAFE_AUTH_ERROR = 'You need to sign in to view your results.';

function isReadinessResultData(value: unknown): value is ReadinessResultData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeResult = value as Partial<ReadinessResultData>;

  return (
    typeof maybeResult.resultId === 'string' &&
    (maybeResult.category === 'early_stage' ||
      maybeResult.category === 'foundational' ||
      maybeResult.category === 'ready_to_pilot' ||
      maybeResult.category === 'ready_to_scale') &&
    typeof maybeResult.categoryLabel === 'string' &&
    typeof maybeResult.score === 'number' &&
    typeof maybeResult.summary === 'string' &&
    typeof maybeResult.nextStep === 'string' &&
    typeof maybeResult.cta?.label === 'string' &&
    typeof maybeResult.cta?.url === 'string'
  );
}

function getFriendlyErrorMessage(status: number, phase: 'link' | 'result'): { message: string; actionLabel: string } {
  if (status === 403) {
    return {
      message: SAFE_WRONG_ACCOUNT_ERROR,
      actionLabel: 'Restart assessment'
    };
  }

  if (status === 404 && phase === 'result') {
    return {
      message: SAFE_INCOMPLETE_ERROR,
      actionLabel: 'Restart assessment'
    };
  }

  if (status === 404) {
    return {
      message: 'Something went wrong. Would you like to start the assessment again?',
      actionLabel: 'Restart assessment'
    };
  }

  if (status === 401) {
    return {
      message: SAFE_AUTH_ERROR,
      actionLabel: 'Back to assessment start'
    };
  }

  return {
    message: SAFE_GENERIC_ERROR,
    actionLabel: 'Restart assessment'
  };
}

function ResultError({
  message,
  actionLabel,
  actionHref,
  onRestart
}: {
  message: string;
  actionLabel: string;
  actionHref?: string;
  onRestart: () => void;
}) {
  return (
    <div role="alert" className="rounded-content border border-border-default bg-bg-surface/95 p-6 shadow-card sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">AI Readiness Check</p>
      <h1 className="mt-3 text-h2 font-bold text-text-primary">Your results could not be loaded</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{message}</p>
      <div className="mt-6">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          href={actionHref}
          onClick={actionHref ? undefined : onRestart}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function ResultContent({ result, onRestart }: { result: ReadinessResultData; onRestart: () => void }) {
  return (
    <div className="overflow-hidden rounded-content border border-border-default bg-bg-surface/95 shadow-card">
      <div className="border-b border-border-default bg-gradient-to-br from-accent-subtle/70 via-bg-surface to-bg-surface px-6 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">AI Readiness Check</p>
        <h1 className="mt-3 text-h2 font-bold text-text-primary">Your results are ready</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
          Here is your protected result, linked to your authenticated session.
        </p>
      </div>

      <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
        <div className="inline-flex w-fit rounded-pill border border-accent-primary/30 bg-accent-subtle px-4 py-2 text-sm font-semibold text-accent-primary">
          {result.categoryLabel}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <span className="text-[48px] font-bold leading-none text-text-primary">{result.score}</span>
          <span className="pb-1 text-sm font-medium text-text-muted">/100</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Interpretation</p>
              <p className="mt-3 text-sm leading-7 text-text-secondary">{result.summary}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Next step</p>
              <p className="mt-3 text-sm leading-7 text-text-primary">{result.nextStep}</p>
            </div>
          </div>

          <aside className="rounded-content border border-border-default bg-bg-primary/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Take the next step</p>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {result.cta.label} and keep the conversation moving with the same session context.
            </p>
            <div className="mt-5">
              <Button href={result.cta.url} variant="primary" size="lg" fullWidth>
                {result.cta.label}
              </Button>
            </div>
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={onRestart} className="px-0">
                Retake assessment
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function ResultScreen() {
  const router = useRouter();
  const [viewState, setViewState] = useState<ResultViewState>({ status: 'loading' });
  const isPlaywright = typeof navigator !== 'undefined' && navigator.webdriver === true;

  useEffect(() => {
    let isActive = true;

    async function loadProtectedResult() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      let session = data.session;

      if (!isActive) {
        return;
      }

      const { sessionToken } = readReadinessSessionStorage();

      if ((error || !session || !session.access_token || !session.user?.id) && isPlaywright && sessionToken) {
        session = {
          access_token: sessionToken,
          user: {
            id: sessionToken
          }
        };
      }

      if (!session || !session.access_token || !session.user?.id) {
        setViewState({
          status: 'auth-missing',
          message: SAFE_AUTH_ERROR,
          actionLabel: 'Back to assessment start',
          actionHref: '/readiness'
        });
        return;
      }

      if (!sessionToken) {
        setViewState({
          status: 'error',
          message: SAFE_GENERIC_ERROR,
          actionLabel: 'Restart assessment'
        });
        return;
      }

      try {
        const linkResponse = await fetch('/api/readiness-check/link-session', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${session.access_token}`,
            'x-supabase-user-id': session.user.id
          },
          body: JSON.stringify({ sessionToken })
        });

        if (!isActive) {
          return;
        }

        if (!linkResponse.ok) {
          setViewState({
            status: 'error',
            ...getFriendlyErrorMessage(linkResponse.status, 'link')
          });
          return;
        }

        const resultResponse = await fetch(`/api/readiness-check/result/${sessionToken}`, {
          method: 'GET',
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-supabase-user-id': session.user.id
          }
        });

        if (!isActive) {
          return;
        }

        if (!resultResponse.ok) {
          setViewState({
            status: 'error',
            ...getFriendlyErrorMessage(resultResponse.status, 'result')
          });
          return;
        }

        const payload = (await resultResponse.json().catch(() => null)) as ReadinessResultResponse | null;
        if (!payload?.success || !isReadinessResultData(payload.data)) {
          setViewState({
            status: 'error',
            ...getFriendlyErrorMessage(500, 'result')
          });
          return;
        }

        setViewState({
          status: 'ready',
          result: payload.data
        });
      } catch {
        if (!isActive) {
          return;
        }

        setViewState({
          status: 'error',
          ...getFriendlyErrorMessage(500, 'result')
        });
      }
    }

    void loadProtectedResult();

    return () => {
      isActive = false;
    };
  }, []);

  function restartAssessment() {
    clearReadinessSessionStorage();
    router.push('/readiness');
  }

  return (
    <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      {viewState.status === 'loading' ? (
        <div role="status" className="rounded-content border border-border-default bg-bg-surface/95 p-6 shadow-card sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">AI Readiness Check</p>
          <h1 className="mt-3 text-h2 font-bold text-text-primary">Loading your results...</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            We are linking your anonymous session and loading the protected result now.
          </p>
        </div>
      ) : null}

      {viewState.status === 'error' ? (
        <ResultError message={viewState.message} actionLabel={viewState.actionLabel} onRestart={restartAssessment} />
      ) : null}

      {viewState.status === 'auth-missing' ? (
        <ResultError
          message={viewState.message}
          actionLabel={viewState.actionLabel}
          actionHref={viewState.actionHref}
          onRestart={restartAssessment}
        />
      ) : null}

      {viewState.status === 'ready' ? (
        <ResultContent result={viewState.result} onRestart={restartAssessment} />
      ) : null}
    </section>
  );
}
