'use client';

import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  buildContactSubmitPayload,
  getResultLabel,
  READINESS_CONTEXT_SOURCE,
  type ContactFormState
} from '@/app/contact/contact-helpers';

type ContactFormProps = {
  source: string;
  result: string;
  formState: ContactFormState;
  setFormState: Dispatch<SetStateAction<ContactFormState>>;
};

export default function ContactForm({ source, result, formState, setFormState }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const resultLabel = getResultLabel(result);
  const isReadinessContext = source === READINESS_CONTEXT_SOURCE;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = buildContactSubmitPayload({
      formState,
      source,
      honeypot: String(formData.get('website') ?? website ?? '')
    });

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      data-testid="contact-form-shell"
      className="mt-4 space-y-4"
      aria-label="Contact form"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="source" value={source} />
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => {
          setWebsite(event.target.value);
        }}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />

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
              enquiryType: event.target.value as ContactFormState['enquiryType']
            }));
          }}
          className="w-full rounded-control border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        >
          <option value="business_enquiry">Business enquiry</option>
          <option value="research_collaboration">Research and collaboration</option>
          <option value="technical_enquiry">Technical enquiry</option>
          <option value="general">General enquiry</option>
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

      {submitError ? (
        <p role="alert" className="text-sm leading-6 text-text-secondary">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center rounded-pill bg-accent-primary px-4 py-2 text-sm font-medium text-white no-underline hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
