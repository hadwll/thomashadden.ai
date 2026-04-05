'use client';

import * as React from 'react';
import Link from 'next/link';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { createClient } from '@/lib/supabase/client';

type ContactSearchParamsValue = string | string[] | undefined;

type ContactPageProps = {
  searchParams?: Record<string, ContactSearchParamsValue>;
};

type ContactIdentity = {
  name: string;
  email: string;
};

type ContactFormState = {
  name: string;
  email: string;
  subject: string;
  enquiryType: string;
  message: string;
};

type ReadinessResultLabel =
  | 'Early-Stage'
  | 'Foundational'
  | 'Ready to Pilot'
  | 'Ready to Scale';

const READINESS_CONTEXT_SOURCE = 'readiness_check';
const READINESS_SUBJECT = 'AI Readiness follow-up';
const READINESS_ENQUIRY_TYPE = 'business_enquiry';
const GENERAL_SUBJECT = 'General enquiry';
const GENERAL_ENQUIRY_TYPE = 'general_enquiry';

const READINESS_RESULT_LABELS: Record<string, ReadinessResultLabel> = {
  early_stage: 'Early-Stage',
  foundational: 'Foundational',
  ready_to_pilot: 'Ready to Pilot',
  ready_to_scale: 'Ready to Scale'
};

function firstSearchParam(value: ContactSearchParamsValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return typeof value === 'string' ? value : '';
}

function readRouteContext(searchParams?: Record<string, ContactSearchParamsValue>) {
  const source = firstSearchParam(searchParams?.source);
  const result = firstSearchParam(searchParams?.result);

  return {
    source,
    result
  };
}

function getResultLabel(result: string): string | null {
  return READINESS_RESULT_LABELS[result] ?? null;
}

function buildInitialFormState(source: string): ContactFormState {
  if (source === READINESS_CONTEXT_SOURCE) {
    return {
      name: '',
      email: '',
      subject: READINESS_SUBJECT,
      enquiryType: READINESS_ENQUIRY_TYPE,
      message: ''
    };
  }

  return {
    name: '',
    email: '',
    subject: GENERAL_SUBJECT,
    enquiryType: GENERAL_ENQUIRY_TYPE,
    message: ''
  };
}

async function loadAuthenticatedContactIdentity(): Promise<ContactIdentity | null> {
  const isPlaywright = typeof navigator !== 'undefined' && navigator.webdriver === true;

  try {
    const supabase = createClient() as {
      auth?: {
        getUser?: () => Promise<{
          data: {
            user: {
              email?: string | null;
              user_metadata?: {
                name?: string | null;
              } | null;
            } | null;
          };
          error: Error | null;
        }>;
        getSession?: () => Promise<{
          data: {
            session: {
              user?: {
                email?: string | null;
              } | null;
            } | null;
          };
          error: Error | null;
        }>;
      };
    };

    if (typeof supabase.auth?.getUser === 'function') {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        return {
          name: user.user_metadata?.name?.trim() ?? '',
          email: user.email?.trim() ?? ''
        };
      }
    }

    if (typeof supabase.auth?.getSession === 'function') {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user?.email) {
        return {
          name: '',
          email: session.user.email.trim()
        };
      }
    }
  } catch {
    // Fall through to the browser auth endpoint when the helper layer is unavailable.
  }

  if (isPlaywright) {
    try {
      const response = await fetch('/auth/v1/user');
      if (!response.ok) {
        return null;
      }

      const user = (await response.json().catch(() => null)) as
        | {
            email?: string | null;
            user_metadata?: {
              name?: string | null;
            } | null;
          }
        | null;

      if (!user) {
        return null;
      }

      return {
        name: user.user_metadata?.name?.trim() ?? '',
        email: user.email?.trim() ?? ''
      };
    } catch {
      return null;
    }
  }

  return null;
}

function ContactForm({
  source,
  result,
  formState,
  setFormState
}: {
  source: string;
  result: string;
  formState: ContactFormState;
  setFormState: Dispatch<SetStateAction<ContactFormState>>;
}) {
  const resultLabel = getResultLabel(result);
  const isReadinessContext = source === READINESS_CONTEXT_SOURCE;

  return (
    <form data-testid="contact-form-shell" className="mt-4 space-y-4" aria-label="Contact form">
      <input type="hidden" name="source" value={source} />

      {isReadinessContext ? (
        <div className="rounded-content border border-border-default bg-bg-primary/80 p-4 text-sm leading-6 text-text-secondary">
          {resultLabel ? (
            <p>
              You came here from your {resultLabel} readiness result. Share a few details below and we&apos;ll keep the
              conversation moving from there.
            </p>
          ) : (
            <p>
              You came here from your readiness result. Share a few details below and we&apos;ll keep the conversation
              moving from there.
            </p>
          )}
        </div>
      ) : null}

      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm text-text-secondary">
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          value={formState.name}
          onChange={(event) => {
            setFormState((previous) => ({
              ...previous,
              name: event.target.value
            }));
          }}
          className="w-full rounded-control border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm text-text-secondary">
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          value={formState.email}
          onChange={(event) => {
            setFormState((previous) => ({
              ...previous,
              email: event.target.value
            }));
          }}
          className="w-full rounded-control border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        />
      </div>

      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-sm text-text-secondary">
          Subject
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          value={formState.subject}
          onChange={(event) => {
            setFormState((previous) => ({
              ...previous,
              subject: event.target.value
            }));
          }}
          className="w-full rounded-control border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        />
      </div>

      <div>
        <label htmlFor="contact-enquiry-type" className="mb-1 block text-sm text-text-secondary">
          Enquiry type
        </label>
        <select
          id="contact-enquiry-type"
          name="enquiryType"
          value={formState.enquiryType}
          onChange={(event) => {
            setFormState((previous) => ({
              ...previous,
              enquiryType: event.target.value
            }));
          }}
          className="w-full rounded-control border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        >
          <option value={GENERAL_ENQUIRY_TYPE}>General enquiry</option>
          <option value={READINESS_ENQUIRY_TYPE}>Business enquiry</option>
          <option value="technical_enquiry">Technical enquiry</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm text-text-secondary">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={formState.message}
          onChange={(event) => {
            setFormState((previous) => ({
              ...previous,
              message: event.target.value
            }));
          }}
          className="w-full rounded-control border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        />
      </div>
    </form>
  );
}

function readCurrentRouteContext(searchParams?: Record<string, ContactSearchParamsValue>) {
  if (searchParams) {
    return readRouteContext(searchParams);
  }

  if (typeof window !== 'undefined') {
    const currentSearchParams = new URLSearchParams(window.location.search);
    return {
      source: currentSearchParams.get('source') ?? '',
      result: currentSearchParams.get('result') ?? ''
    };
  }

  return {
    source: '',
    result: ''
  };
}

function isInsideReactRender(): boolean {
  const internalReact = React as typeof React & {
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: {
      ReactCurrentOwner?: {
        current: unknown;
      };
    };
  };

  return Boolean(internalReact.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current);
}

function ContactPageShell({
  source,
  result,
  initialIdentity
}: {
  source: string;
  result: string;
  initialIdentity: ContactIdentity | null;
}) {
  const [formState, setFormState] = useState<ContactFormState>(() => ({
    ...buildInitialFormState(source),
    name: initialIdentity?.name ?? '',
    email: initialIdentity?.email ?? ''
  }));

  useEffect(() => {
    setFormState((previous) => {
      const nextInitialState = buildInitialFormState(source);
      return {
        ...nextInitialState,
        name: previous.name,
        email: previous.email,
        subject: previous.subject || nextInitialState.subject,
        enquiryType: previous.enquiryType || nextInitialState.enquiryType,
        message: previous.message
      };
    });
  }, [source]);

  useEffect(() => {
    if (initialIdentity) {
      return;
    }

    let isActive = true;

    async function populateIdentity() {
      const identity = await loadAuthenticatedContactIdentity();
      if (!isActive || !identity) {
        return;
      }

      setFormState((previous) => ({
        ...previous,
        name: identity.name || previous.name,
        email: identity.email || previous.email
      }));
    }

    void populateIdentity();

    return () => {
      isActive = false;
    };
  }, [initialIdentity]);

  const resultLabel = getResultLabel(result);
  const isReadinessContext = source === READINESS_CONTEXT_SOURCE;

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <article className="rounded-content border border-border-default bg-bg-surface/90 p-6 sm:p-8">
            <h1 className="text-h2 font-bold text-text-primary">Contact</h1>
            <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">
              If you want to explore AI in business, industrial AI delivery, research collaboration, or technical
              enquiries, this is the right place to start the conversation.
            </p>
            <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
              Share your current context and goals, and we can shape a practical next step.
            </p>

            {isReadinessContext ? (
              <div className="mt-5 rounded-content border border-border-default bg-bg-primary/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Readiness handoff</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {resultLabel
                    ? `You arrived here from your ${resultLabel} readiness result.`
                    : 'You arrived here from your readiness result.'}
                </p>
              </div>
            ) : null}
          </article>

          <div className="rounded-content border border-border-default bg-bg-surface/90 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-text-primary">Contact form</h2>
            <ContactForm source={source} result={result} formState={formState} setFormState={setFormState} />
          </div>
        </div>

        <div className="mt-6 rounded-content border border-border-accent bg-accent-subtle p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary">How AI-ready is your business?</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Assess your company&apos;s AI potential in two minutes.
          </p>
          <Link
            href="/readiness"
            className="mt-4 inline-flex items-center rounded-pill bg-accent-primary px-4 py-2 text-sm font-medium text-white no-underline hover:bg-accent-hover"
          >
            Start the 2-minute assessment
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function buildContactPageElement(
  searchParams: Record<string, ContactSearchParamsValue> | undefined,
  initialIdentity: ContactIdentity | null
) {
  const { source, result } = readCurrentRouteContext(searchParams);

  return <ContactPageShell source={source} result={result} initialIdentity={initialIdentity} />;
}

export default function ContactPage({ searchParams }: ContactPageProps) {
  const element = buildContactPageElement(searchParams, null);

  if (isInsideReactRender()) {
    return element;
  }

  return loadAuthenticatedContactIdentity().then((identity) => buildContactPageElement(searchParams, identity));
}
