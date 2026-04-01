type RoutePlaceholderProps = {
  title: string;
  route: string;
  note?: string;
};

export function RoutePlaceholder({ title, route, note }: RoutePlaceholderProps) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-content items-center px-4 py-12 sm:px-6 lg:px-8">
      <section
        aria-label={`${title} placeholder`}
        className="w-full rounded-content border border-border-default bg-bg-surface p-6 shadow-card sm:p-10"
      >
        <p className="font-mono text-small text-text-muted">Route: {route}</p>
        <h1 className="mt-3 text-h2 font-bold text-text-primary">{title}</h1>
        <p className="mt-3 text-body text-text-secondary">Placeholder route for SPR-01 bootstrap.</p>
        <p className="mt-2 text-small text-text-muted">
          {note ?? 'Page shell composition and live content wiring will land in later tickets.'}
        </p>
      </section>
    </div>
  );
}
