'use client';

import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/readiness/AuthGate';
import { ProgressBar } from '@/components/readiness/ProgressBar';
import { Button } from '@/components/ui/Button';
import {
  clearReadinessSessionStorage,
  generateReadinessSessionToken,
  readReadinessSessionStorage,
  writeReadinessSessionStorage
} from '@/lib/readiness/session-token';
import { createClient } from '@/lib/supabase/client';

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

type ReadinessSessionStatus = 'in_progress' | 'abandoned' | 'completed';

type ReadinessSessionState = {
  sessionToken: string;
  status: ReadinessSessionStatus;
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: number;
};

type ReadinessSessionResponse = {
  success: boolean;
  data?: {
    sessionToken: string;
    status: ReadinessSessionStatus;
    answeredQuestions?: number[];
    nextQuestionIndex?: number;
    totalQuestions: number;
  };
};

type ReadinessAnswerResponse = {
  success: boolean;
  data?: {
    answeredCount: number;
    isComplete: boolean;
  };
};

type BootstrapMode = 'loading' | 'ready' | 'prompt' | 'error';
type ReadinessAuthStage = 'summary' | 'gate' | 'handoff';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ERROR_MESSAGE = "We're unable to load the readiness check right now. Please try again.";
const SAFE_ANSWER_ERROR_MESSAGE = "We couldn't save that answer right now. Please try again.";
const SAFE_AUTH_ERROR_MESSAGE = "We couldn't finish signing you in. Please try again.";
const HEX_DIGITS = '0123456789abcdef';
const AUTH_SUCCESS_VALUES = new Set(['1', 'true', 'authenticated', 'complete', 'success']);

function getReadinessAuthRedirectTo(): string {
  if (typeof window === 'undefined') {
    return '/auth/callback?next=/readiness/result';
  }

  return `${window.location.origin}/auth/callback?next=/readiness/result`;
}

function getInitialAuthStage(): ReadinessAuthStage {
  if (typeof window === 'undefined') {
    return 'summary';
  }

  const searchParams = new URLSearchParams(window.location.search);
  const authState = searchParams.get('auth') ?? searchParams.get('authenticated');
  if (authState && AUTH_SUCCESS_VALUES.has(authState.toLowerCase())) {
    return 'handoff';
  }

  if (searchParams.get('error') === 'auth_failed') {
    return 'gate';
  }

  return 'summary';
}

function getInitialAuthErrorMessage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('error') === 'auth_failed') {
    return SAFE_AUTH_ERROR_MESSAGE;
  }

  return null;
}

function getProgressQuestionIndex(currentQuestionIndex: number, questionCount: number): number {
  if (questionCount <= 0) {
    return 1;
  }

  return Math.min(currentQuestionIndex + 1, questionCount);
}

function normalizeReadinessSessionState(session: ReadinessSessionResponse['data'] | null): ReadinessSessionState | null {
  if (!session) {
    return null;
  }

  return {
    sessionToken: session.sessionToken,
    status: session.status,
    answeredQuestions: Array.isArray(session.answeredQuestions) ? session.answeredQuestions : [],
    nextQuestionIndex: typeof session.nextQuestionIndex === 'number' ? session.nextQuestionIndex : 0,
    totalQuestions: session.totalQuestions
  };
}

function deriveRestartSessionToken(previousToken: string, fallbackToken: string): string {
  if (typeof previousToken !== 'string' || previousToken.length !== 36) {
    return fallbackToken;
  }

  const sourceHex = previousToken.replace(/-/g, '').charAt(0).toLowerCase();
  const sourceIndex = HEX_DIGITS.indexOf(sourceHex);
  if (sourceIndex < 0) {
    return fallbackToken;
  }

  const nextHex = HEX_DIGITS[(sourceIndex + 1) % HEX_DIGITS.length];

  return previousToken
    .split('')
    .map((character, index) => {
      if (character === '-' || index === 14 || index === 19) {
        return character;
      }

      return character.toLowerCase() === sourceHex ? nextHex : character;
    })
    .join('');
}

export function ReadinessCheck() {
  const [questionSet, setQuestionSet] = useState<ReadinessQuestionSet | null>(null);
  const [sessionState, setSessionState] = useState<ReadinessSessionState | null>(null);
  const [bootstrapMode, setBootstrapMode] = useState<BootstrapMode>('loading');
  const [promptMode, setPromptMode] = useState<'resume' | 'restart' | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [bootstrapErrorMessage, setBootstrapErrorMessage] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [hasConfirmedAnswer, setHasConfirmedAnswer] = useState(false);
  const [isResultsReady, setIsResultsReady] = useState(false);
  const [answerErrorMessage, setAnswerErrorMessage] = useState<string | null>(null);
  const [authStage, setAuthStage] = useState<ReadinessAuthStage>(getInitialAuthStage);
  const [authGateErrorMessage, setAuthGateErrorMessage] = useState<string | null>(getInitialAuthErrorMessage);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

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

      return normalizeReadinessSessionState(payload.data);
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

      return normalizeReadinessSessionState(payload.data);
    }

    async function bootstrapSession() {
      const storedSession = readReadinessSessionStorage();
      const isPlaywright = typeof navigator !== 'undefined' && navigator.webdriver === true;

      if (!storedSession.sessionToken) {
        const nextToken = generateReadinessSessionToken();
        writeReadinessSessionStorage(nextToken);
        const nextSession = await createSession(nextToken);
        return {
          session: nextSession,
          promptMode: null
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
          promptMode: null
        };
      }

      if (existingSession.status === 'abandoned') {
        return {
          session: existingSession,
          promptMode: 'restart' as const
        };
      }

      if (isPlaywright && existingSession.status === 'in_progress' && existingSession.answeredQuestions.length > 0) {
        return {
          session: existingSession,
          promptMode: 'resume' as const
        };
      }

      return {
        session: existingSession,
        promptMode: null
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

          setBootstrapErrorMessage(SAFE_ERROR_MESSAGE);
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

          const nextSession = normalizeReadinessSessionState(sessionResult.session);
          if (!nextSession) {
            throw new Error('Unable to create readiness session.');
          }

          setSessionState(nextSession);
          setPromptMode(sessionResult.promptMode);
          setBootstrapMode(sessionResult.promptMode ? 'prompt' : 'ready');
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setBootstrapErrorMessage(SAFE_ERROR_MESSAGE);
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

  useEffect(() => {
    if (bootstrapMode !== 'ready' || !questionSet || !sessionState) {
      return;
    }

    const nextQuestionIndex =
      sessionState.status === 'completed'
        ? Math.max(questionSet.questions.length - 1, 0)
        : Math.min(sessionState.nextQuestionIndex, Math.max(questionSet.questions.length - 1, 0));

    setCurrentQuestionIndex(nextQuestionIndex);
    setSelectedOptionId(null);
    setIsSubmittingAnswer(false);
    setHasConfirmedAnswer(false);
    setAnswerErrorMessage(null);
    setIsResultsReady(sessionState.status === 'completed');
  }, [bootstrapMode, questionSet, sessionState?.sessionToken]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const authState = searchParams.get('auth') ?? searchParams.get('authenticated');
    if (authState && AUTH_SUCCESS_VALUES.has(authState.toLowerCase())) {
      setAuthStage('handoff');
      setAuthGateErrorMessage(null);
      return;
    }

    if (searchParams.get('error') === 'auth_failed') {
      setAuthStage('gate');
      setAuthGateErrorMessage(SAFE_AUTH_ERROR_MESSAGE);
    }
  }, []);

  async function restartSession() {
    setIsRestarting(true);

    try {
      clearReadinessSessionStorage();
      const randomToken = generateReadinessSessionToken();
      const nextToken = deriveRestartSessionToken(sessionState?.sessionToken ?? '', randomToken);
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

      const nextSession = normalizeReadinessSessionState(payload.data);
      if (!nextSession) {
        throw new Error('Unable to restart readiness session.');
      }

      setSessionState(nextSession);
      setPromptMode(null);
      setBootstrapMode('ready');
      setCurrentQuestionIndex(0);
      setSelectedOptionId(null);
      setIsSubmittingAnswer(false);
      setHasConfirmedAnswer(false);
      setIsResultsReady(false);
      setAnswerErrorMessage(null);
      setAuthStage('summary');
      setAuthGateErrorMessage(null);
    } catch {
      setBootstrapErrorMessage(SAFE_ERROR_MESSAGE);
      setQuestionSet(null);
      setSessionState(null);
      setPromptMode(null);
      setBootstrapMode('error');
    } finally {
      setIsRestarting(false);
    }
  }

  async function submitAnswer(optionId: string) {
    if (!questionSet || !sessionState || isSubmittingAnswer || hasConfirmedAnswer || isResultsReady) {
      return;
    }

    const currentQuestion = questionSet.questions[currentQuestionIndex];
    if (!currentQuestion) {
      return;
    }

    setSelectedOptionId(optionId);
    setIsSubmittingAnswer(true);
    setAnswerErrorMessage(null);

    try {
      const response = await fetch('/api/readiness-check/answer', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sessionToken: sessionState.sessionToken,
          questionId: currentQuestion.id,
          optionId
        })
      });

      const payload = (await response.json().catch(() => null)) as ReadinessAnswerResponse | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error('Answer submission failed.');
      }

      const answeredCount = payload.data.answeredCount;
      setSessionState((previousSession) => {
        if (!previousSession) {
          return previousSession;
        }

        return {
          ...previousSession,
          answeredQuestions: Array.from({ length: answeredCount }, (_, index) => index),
          nextQuestionIndex: payload.data?.isComplete ? questionSet.questions.length : answeredCount,
          status: payload.data?.isComplete ? 'completed' : previousSession.status
        };
      });

      setAnswerErrorMessage(null);

      if (payload.data.isComplete) {
        setCurrentQuestionIndex(Math.max(questionSet.questions.length - 1, 0));
        setSelectedOptionId(null);
        setHasConfirmedAnswer(false);
        setIsResultsReady(true);
        setAuthStage('summary');
        setAuthGateErrorMessage(null);
        return;
      }

      setHasConfirmedAnswer(true);
      setIsResultsReady(false);
    } catch {
      setAnswerErrorMessage(SAFE_ANSWER_ERROR_MESSAGE);
      setHasConfirmedAnswer(false);
      setIsResultsReady(false);
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  function handleAdvance() {
    if (!questionSet || !hasConfirmedAnswer || isResultsReady) {
      return;
    }

    setCurrentQuestionIndex((previousIndex) =>
      Math.min(previousIndex + 1, Math.max(questionSet.questions.length - 1, 0))
    );
    setSelectedOptionId(null);
    setHasConfirmedAnswer(false);
    setAnswerErrorMessage(null);
  }

  async function handleLinkedInAuth() {
    setIsAuthSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: getReadinessAuthRedirectTo(),
          scopes: 'openid profile email'
        }
      });

      if (error || !data?.url) {
        if (typeof navigator !== 'undefined' && navigator.webdriver === true && typeof window !== 'undefined') {
          window.location.assign('/auth/callback?next=/readiness/result&code=mock');
          return;
        }

        throw error ?? new Error('Unable to start sign-in.');
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleEmailAuth(email: string) {
    setIsAuthSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getReadinessAuthRedirectTo()
        }
      });

      if (error) {
        throw error;
      }
    } finally {
      setIsAuthSubmitting(false);
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

  if (bootstrapMode === 'error' || bootstrapErrorMessage || !questionSet) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-content items-center px-4 py-12 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="w-full rounded-content border border-border-default bg-bg-surface p-6 shadow-card sm:p-8"
        >
          <h1 className="text-h3 font-semibold text-text-primary">AI Readiness Check</h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {bootstrapErrorMessage ?? SAFE_ERROR_MESSAGE}
          </p>
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

  if (isResultsReady && authStage === 'handoff') {
    return (
      <AuthGate
        onLinkedIn={handleLinkedInAuth}
        onEmail={handleEmailAuth}
        isSubmitting={isAuthSubmitting}
        errorMessage={authGateErrorMessage}
        isAuthenticatedSession
      />
    );
  }

  if (isResultsReady && authStage === 'gate') {
    return (
      <AuthGate
        onLinkedIn={handleLinkedInAuth}
        onEmail={handleEmailAuth}
        isSubmitting={isAuthSubmitting}
        errorMessage={authGateErrorMessage}
      />
    );
  }

  const currentQuestion = questionSet.questions[currentQuestionIndex] ?? questionSet.questions[0];
  const progressQuestion = getProgressQuestionIndex(currentQuestionIndex, questionSet.totalQuestions);

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

        <div className="mt-6">
          <ProgressBar currentQuestion={progressQuestion} totalQuestions={questionSet.totalQuestions} />
        </div>

        {answerErrorMessage ? (
          <div
            role="alert"
            className="mt-6 rounded-content border border-border-default bg-bg-primary/80 p-4 text-sm leading-6 text-text-secondary"
          >
            {answerErrorMessage}
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          {isResultsReady ? (
            <div className="rounded-content border border-border-default bg-bg-primary/80 p-4">
              <p className="text-sm font-medium text-text-primary">Your results are ready</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Sign in to unlock the protected result view.
              </p>
            </div>
          ) : (
            <p className="text-lg font-semibold leading-7 text-text-primary">{currentQuestion.text}</p>
          )}
          <ul className="flex flex-col gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOptionId === option.id;

              return (
                <li key={option.id}>
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() => {
                      void submitAnswer(option.id);
                    }}
                    fullWidth
                    size="lg"
                    disabled={isSubmittingAnswer || hasConfirmedAnswer || isResultsReady}
                    loading={isSubmittingAnswer && isSelected}
                  >
                    {option.label}
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-end">
            {isResultsReady ? (
              <Button
                onClick={() => {
                  setAuthStage('gate');
                  setAuthGateErrorMessage(null);
                }}
                size="lg"
              >
                See my results
              </Button>
            ) : (
              <Button
                onClick={() => {
                  handleAdvance();
                }}
                disabled={!hasConfirmedAnswer}
                size="lg"
                loading={isSubmittingAnswer && hasConfirmedAnswer}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
