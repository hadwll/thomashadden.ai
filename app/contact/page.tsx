import { PageShell } from '@/components/layout/PageShell';
import Link from 'next/link';

export default function ContactPage() {
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
          </article>

          <div className="rounded-content border border-border-default bg-bg-surface/90 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-text-primary">Contact form</h2>
            <form data-testid="contact-form-shell" className="mt-4 space-y-4" aria-label="Contact form">
              <div>
                <label htmlFor="contact-name" className="mb-1 block text-sm text-text-secondary">
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
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
                  className="w-full rounded-control border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-1 block text-sm text-text-secondary">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  className="w-full rounded-control border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
                />
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 rounded-content border border-border-accent bg-accent-subtle p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary">How AI-ready is your business?</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Assess your company&apos;s AI potential in two minutes.</p>
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
