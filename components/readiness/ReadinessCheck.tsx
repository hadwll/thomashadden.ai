'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  clearReadinessSessionStorage,
  generateReadinessSessionToken,
  readReadinessSessionStorage,
  writeReadinessSessionStorage
} from '@/lib/readiness/session-token';

type ReadinessQuestionOption = {
  id: string;
  label: string;
};

type ReadinessQuestion = {
  id: string;
  order: number;
  text: string;
  type: 'single_choice';
  options: ReadinessQuestionOption[];
};

type ReadinessQuestionSet = {
  version: string;
  totalQuestions: number;
  estimatedMinutes: number;
  questions: ReadinessQuestion[];
};

type ReadinessQuestionsResponse = {
  success: boolean;
  data?: ReadinessQuestionSet;
};

type ReadinessSessionStatus = 'in_progress' | 'abandoned';

type ReadinessSessionState = {
  sessionToken: string;
  status: ReadinessSessionStatus;
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: number;
};

type ReadinessSessionResponse = {
  success: boolean;
  data?: ReadinessSessionState;
};

type BootstrapMode = 'loading' | 'ready' | 'prompt' | 'error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ERROR_MESSAGE = "We're unable to load the readiness check right now. Please try again.";

export function ReadinessCheck() {
  const [questionSet, setQuestionSet] = useState<ReadinessQuestionSet | null>(null);
  const [sessionState, setSessionState] = useState<ReadinessSessionState | null>(null);
  const [bootstrapMode, setBootstrapMode] = useState<BootstrapMode>('loading');
  const [promptMode, setPromptMode] = useState<'resume' | 'restart' | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadQuestionSet() {
      try {
        const response = await fetch('/api/readiness-check/questions', {
          method: 'GET'
        });
        if (!response.ok) {
          throw new Error('Request failed.');
        }

        const payload = (await response.json()) as ReadinessQuestionsResponse;
        const nextQuestionSet = payload.success ? payload.data ?? null : null;

        if (!nextQuestionSet || !Array.isArray(nextQuestionSet.questions) || nextQuestionSet.questions.length === 0) {
          throw new Error('Invalid readiness question payload.');
        }

        if (!isActive) {
          return;
        }

        setQuestionSet(nextQuestionSet);
        return nextQuestionSet;
      } catch {
        if (!isActive) {
          return;
        }

        throw new Error('Unable to load readiness questions.');
      }
    }

    async function createSession(sessionToken: string) {
      const response = await fetch('/api/readiness-check/session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ sessionToken })
      });

      const payload = (await response.json().catch(() => null)) as ReadinessSessionResponse | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error('Unable to create readiness session.');
      }

      return payload.data;
    }

    async function loadSessionState(sessionToken: string) {
      const response = await fetch(`/api/readiness-check/session/${sessionToken}`, {
        method: 'GET'
      });
      const payload = (await response.json().catch(() => null)) as ReadinessSessionResponse | null;

      if (response.status === 404) {
        return null;
      }

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error('Unable to load readiness session.');
      }

      return payload.data;
    }

    async function bootstrapSession() {
      const storedSession = readReadinessSessionStorage();

      if (!storedSession.sessionToken) {
        const nextToken = generateReadinessSessionToken();
        writeReadinessSessionStorage(nextToken);
        const nextSession = await createSession(nextToken);
        return {
          session: nextSession,
          promptMode: null as const
        };
      }

      if (!UUID_REGEX.test(storedSession.sessionToken)) {
        throw new Error('Stored readiness session token is malformed.');
      }

      const existingSession = await loadSessionState(storedSession.sessionToken);
      if (!existingSession) {
        clearReadinessSessionStorage();
        const nextToken = generateReadinessSessionToken();
        writeReadinessSessionStorage(nextToken);
        const nextSession = await createSession(nextToken);
        return {
          session: nextSession,
          promptMode: null as const
        };
      }

      return {
        session: existingSession,
        promptMode: existingSession.status === 'abandoned' ? ('restart' as const) : ('resume' as const)
      };
    }

    async function loadBootstrap() {
      void loadQuestionSet()
        .then((loadedQuestionSet) => {
          if (!isActive || !loadedQuestionSet) {
            return;
          }

          setQuestionSet(loadedQuestionSet);
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setErrorMessage(SAFE_ERROR_MESSAGE);
          setQuestionSet(null);
          setSessionState(null);
          setPromptMode(null);
          setBootstrapMode('error');
        });

      void bootstrapSession()
        .then((sessionResult) => {
          if (!isActive) {
            return;
          }

          setSessionState(sessionResult.session);
          setPromptMode(sessionResult.promptMode);
          setBootstrapMode(sessionResult.promptMode ? 'prompt' : 'ready');
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setErrorMessage(SAFE_ERROR_MESSAGE);
          setQuestionSet(null);
          setSessionState(null);
          setPromptMode(null);
          setBootstrapMode('error');
        });
    }

    void loadBootstrap();

    return () => {
      isActive = false;
    };
  }, []);

  async function restartSession() {
    setIsRestarting(true);

    try {
      clearReadinessSessionStorage();
      const nextToken = generateReadinessSessionToken();
      writeReadinessSessionStorage(nextToken);

      const response = await fetch('/api/readiness-check/session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ sessionToken: nextToken })
      });

      const payload = (await response.json().catch(() => null)) as ReadinessSessionResponse | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error('Unable to restart readiness session.');
      }

      setSessionState(payload.data);
      setPromptMode(null);
      setBootstrapMode('ready');
    } catch {
      setErrorMessage(SAFE_ERROR_MESSAGE);
      setQuestionSet(null);
      setSessionState(null);
      setPromptMode(null);
      setBootstrapMode('error');
    } finally {
      setIsRestarting(false);
    }
  }

  if (bootstrapMode === 'loading' || (bootstrapMode === 'ready' && !questionSet)) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-content items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full rounded-content border border-border-default bg-bg-surface p-6 shadow-card sm:p-8">
          <p className="text-sm font-medium text-text-secondary">Loading readiness questions...</p>
        </div>
      </section>
    );
  }

  if (bootstrapMode === 'error' || errorMessage || !questionSet) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-content items-center px-4 py-12 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="w-full rounded-content border border-border-default bg-bg-surface p-6 shadow-card sm:p-8"
        >
          <h1 className="text-h3 font-semibold text-text-primary">AI Readiness Check</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{errorMessage ?? SAFE_ERROR_MESSAGE}</p>
        </div>
      </section>
    );
  }

  if (bootstrapMode === 'prompt' && sessionState) {
    const answeredCount = sessionState.answeredQuestions.length;
    const questionCount = questionSet?.totalQuestions ?? sessionState.totalQuestions;
    const estimatedMinutes = questionSet?.estimatedMinutes ?? 2;
    const promptTitle = 'Continue where you left off?';
    const promptBody =
      promptMode === 'restart'
        ? `Your previous readiness session has expired, so you'll need to start a fresh assessment.`
        : `You've answered ${answeredCount} of ${sessionState.totalQuestions} questions. Pick up from where you stopped, or start again from the beginning.`;

    return (
      <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-content border border-border-default bg-bg-surface/95 p-6 shadow-card sm:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">AI Readiness Check</p>
            <h1 className="text-h2 font-bold text-text-primary">AI Readiness Check</h1>
            <p className="text-sm text-text-secondary">
              {questionCount} questions · {estimatedMinutes} minutes
            </p>
          </div>

          <div className="mt-8 rounded-content border border-border-default bg-bg-primary/80 p-5 sm:p-6">
            <p className="text-lg font-semibold leading-7 text-text-primary">{promptTitle}</p>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{promptBody}</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {promptMode === 'resume' ? (
                <Button
                  onClick={() => {
                    setPromptMode(null);
                    setBootstrapMode('ready');
                  }}
                  fullWidth
                  size="lg"
                >
                  Continue
                </Button>
              ) : null}
              <Button
                variant={promptMode === 'resume' ? 'secondary' : 'primary'}
                onClick={() => {
                  void restartSession();
                }}
                fullWidth
                size="lg"
                loading={isRestarting}
              >
                Start again
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const firstQuestion = questionSet.questions[0];

  return (
    <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="rounded-content border border-border-default bg-bg-surface/95 p-6 shadow-card sm:p-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">AI Readiness Check</p>
          <h1 className="text-h2 font-bold text-text-primary">AI Readiness Check</h1>
          <p className="text-sm text-text-secondary">
            {questionSet.totalQuestions} questions · {questionSet.estimatedMinutes} minutes
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <p className="text-lg font-semibold leading-7 text-text-primary">{firstQuestion.text}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {firstQuestion.options.map((option) => (
              <li
                key={option.id}
                className="rounded-control border border-border-default bg-bg-primary px-4 py-3 text-sm font-medium text-text-primary"
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
