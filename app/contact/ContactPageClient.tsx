'use client';

import Link from 'next/link';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import {
  buildInitialFormState,
  CONTACT_FALLBACK_INTRO,
  getResultLabel,
  loadAuthenticatedContactIdentity,
  READINESS_CONTEXT_SOURCE,
  READINESS_ENQUIRY_TYPE,
  GENERAL_ENQUIRY_TYPE,
  type ContactFormState,
  type ContactIdentity
} from './contact-helpers';

type ContactPageClientProps = {
  source: string;
  result: string;
  initialIdentity: ContactIdentity | null;
  introParagraphs: string[];
};

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

function ContactPageShell({
  source,
  result,
  initialIdentity,
  introParagraphs
}: ContactPageClientProps) {
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

  const safeIntroParagraphs = introParagraphs.length > 0 ? introParagraphs : [CONTACT_FALLBACK_INTRO];

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <article className="rounded-content border border-border-default bg-bg-surface/90 p-6 sm:p-8">
            <h1 className="text-h2 font-bold text-text-primary">Contact</h1>

            <div className="mt-4 space-y-3">
              {safeIntroParagraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-text-secondary sm:text-base">
                  {paragraph}
                </p>
              ))}
            </div>
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

export default ContactPageShell;
