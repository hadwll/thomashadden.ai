import Link from 'next/link';

export function CollaborateCTA() {
  return (
    <section data-testid="collaborate-row" className="pt-1">
      <Link
        href="/contact"
        className="block min-h-12 border-b border-border-default px-1 py-3 text-center text-base font-semibold text-accent-primary no-underline"
      >
        Collaborate on Research
      </Link>
    </section>
  );
}
