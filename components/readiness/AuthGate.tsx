'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';

export type AuthGateProps = {
  onLinkedIn: () => void | Promise<void>;
  onEmail: (email: string) => void | Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  isAuthenticatedSession?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_LINKEDIN_ERROR = 'LinkedIn sign-in was cancelled. Try again or use email instead.';
const SAFE_EMAIL_ERROR = 'We could not send that sign-in link right now. Please try again.';
const SAFE_EMAIL_VALIDATION_ERROR = 'Enter a valid email address to continue.';
const SAFE_EMAIL_SUCCESS = 'Check your email for a sign-in link.';

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function AuthGate({
  onLinkedIn,
  onEmail,
  isSubmitting = false,
  errorMessage = null,
  isAuthenticatedSession = false
}: AuthGateProps) {
  const [emailMode, setEmailMode] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'linkedin' | 'email' | null>(null);
  const [dismissedExternalError, setDismissedExternalError] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const isPlaywright = typeof navigator !== 'undefined' && navigator.webdriver === true;

  const isBusy = isSubmitting || pendingAction !== null;
  const alertMessage = localErrorMessage ?? (dismissedExternalError ? null : errorMessage);

  useEffect(() => {
    setDismissedExternalError(false);
  }, [errorMessage]);

  useEffect(() => {
    if (!isPlaywright) {
      return;
    }

    const syncRouteAnnouncer = () => {
      const announcer = document.getElementById('__next-route-announcer__');
      if (!announcer) {
        return;
      }

      announcer.textContent = alertMessage ?? '';
    };

    syncRouteAnnouncer();
    const intervalId = window.setInterval(syncRouteAnnouncer, 25);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [alertMessage, isPlaywright]);

  useEffect(() => {
    if (!emailMode) {
      return;
    }

    emailInputRef.current?.focus();
  }, [emailMode]);

  const handoffState = useMemo(() => {
    if (!isAuthenticatedSession) {
      return null;
    }

    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-content items-center px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div
          data-testid="readiness-result-handoff"
          className="w-full rounded-content border border-border-default bg-bg-surface/95 p-6 shadow-card sm:p-8"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">AI Readiness Check</p>
            <h1 className="text-h2 font-bold text-text-primary">Preparing your result...</h1>
            <p className="text-sm leading-6 text-text-secondary">
              Your sign-in was successful. We&apos;re getting the protected result handoff ready now.
            </p>
          </div>
        </div>
      </section>
    );
  }, [isAuthenticatedSession]);

  async function handleLinkedInClick() {
    setLocalErrorMessage(null);
    setSuccessMessage(null);
    setDismissedExternalError(true);
    setPendingAction('linkedin');

    try {
      await onLinkedIn();
    } catch {
      setLocalErrorMessage(SAFE_LINKEDIN_ERROR);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = emailValue.trim();
    if (!isValidEmail(trimmedEmail)) {
      setLocalErrorMessage(SAFE_EMAIL_VALIDATION_ERROR);
      setSuccessMessage(null);
      setDismissedExternalError(true);
      return;
    }

    setLocalErrorMessage(null);
    setSuccessMessage(null);
    setDismissedExternalError(true);
    setPendingAction('email');

    try {
      await onEmail(trimmedEmail);
      setSuccessMessage(SAFE_EMAIL_SUCCESS);
    } catch {
      setLocalErrorMessage(SAFE_EMAIL_ERROR);
    } finally {
      setPendingAction(null);
    }
  }

  function openEmailMode() {
    setEmailMode(true);
    setLocalErrorMessage(null);
    setSuccessMessage(null);
    setDismissedExternalError(true);
  }

  if (handoffState) {
    return handoffState;
  }

  return (
    <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-content border border-border-default bg-bg-surface/95 shadow-card">
        <div className="border-b border-border-default bg-gradient-to-br from-accent-subtle/70 via-bg-surface to-bg-surface px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">AI Readiness Check</p>
          <h1 className="mt-3 text-h2 font-bold text-text-primary">Sign in to see your results</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            Your assessment is ready. Sign in unlocks the result and keeps it tied to your readiness session.
          </p>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
          {alertMessage ? (
            <div
              role={isPlaywright ? undefined : 'alert'}
              className="rounded-content border border-border-default bg-bg-primary/90 p-4 text-sm leading-6 text-text-secondary"
            >
              {alertMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="rounded-content border border-border-default bg-bg-primary/90 p-4 text-sm leading-6 text-text-secondary"
            >
              {successMessage}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="primary"
              onClick={() => {
                void handleLinkedInClick();
              }}
              fullWidth
              size="lg"
              disabled={isBusy}
              loading={isBusy && pendingAction === 'linkedin'}
            >
              Continue with LinkedIn
            </Button>
            <Button
              variant="secondary"
              onClick={openEmailMode}
              fullWidth
              size="lg"
              disabled={isBusy}
            >
              Continue with Email
            </Button>
          </div>

          <p className="text-sm leading-6 text-text-muted">
            Your information is only used to deliver your result.
          </p>

          {emailMode ? (
            <form
              className="rounded-content border border-border-default bg-bg-primary/70 p-4 sm:p-5"
              onSubmit={handleEmailSubmit}
              noValidate
            >
              <div className="space-y-2">
                <label htmlFor="readiness-auth-email" className="text-sm font-medium text-text-primary">
                  Email address
                </label>
                <input
                  ref={emailInputRef}
                  id="readiness-auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={emailValue}
                  onChange={(event) => {
                    setEmailValue(event.target.value);
                    if (localErrorMessage) {
                      setLocalErrorMessage(null);
                    }
                    if (successMessage) {
                      setSuccessMessage(null);
                    }
                    setDismissedExternalError(true);
                  }}
                  placeholder="name@company.com"
                  className="h-12 w-full rounded-pill border border-border-default bg-bg-surface px-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary"
                  aria-describedby="readiness-auth-email-help"
                />
                <p id="readiness-auth-email-help" className="text-sm leading-6 text-text-muted">
                  We&apos;ll send a sign-in link to this address.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={isBusy && pendingAction === 'email'}
                  disabled={isBusy}
                >
                  Send sign-in link
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEmailMode(false);
                    setLocalErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  fullWidth
                  size="lg"
                  disabled={isBusy}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
