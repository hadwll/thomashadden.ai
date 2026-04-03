'use client';

import { useEffect, useState } from 'react';

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

const SAFE_ERROR_MESSAGE = "We're unable to load the readiness check right now. Please try again.";

export function ReadinessCheck() {
  const [questionSet, setQuestionSet] = useState<ReadinessQuestionSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadQuestionSet() {
      try {
        const response = await fetch('/api/readiness-check/questions');
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
        setErrorMessage(null);
      } catch {
        if (!isActive) {
          return;
        }

        setErrorMessage(SAFE_ERROR_MESSAGE);
        setQuestionSet(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadQuestionSet();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-content items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full rounded-content border border-border-default bg-bg-surface p-6 shadow-card sm:p-8">
          <p className="text-sm font-medium text-text-secondary">Loading readiness questions...</p>
        </div>
      </section>
    );
  }

  if (errorMessage || !questionSet) {
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
