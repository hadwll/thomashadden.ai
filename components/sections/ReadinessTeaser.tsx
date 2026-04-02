import { Button } from '@/components/ui/Button';

export type ReadinessTeaserProps = {
  variant: 'desktop' | 'mobile';
};

export function ReadinessTeaser({ variant }: ReadinessTeaserProps) {
  if (variant === 'mobile') {
    return (
      <section
        data-testid="readiness-card"
        className="rounded-content border border-border-accent bg-bg-surface/90 p-4 shadow-card"
      >
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-text-primary">How AI-ready is your business?</h2>
          <p className="text-sm text-text-secondary">Assess your company's AI potential.</p>
          <Button href="/readiness" variant="primary" size="md" fullWidth>
            Start the 2-minute assessment
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="readiness-strip"
      className="rounded-vessel border border-border-accent bg-bg-surface/90 px-5 py-5 shadow-card"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-h3 font-semibold text-text-primary">How AI-ready is your business?</h2>
          <p className="text-sm text-text-secondary">Assess your company's AI potential.</p>
        </div>
        <Button href="/readiness" variant="primary" size="md">
          Start the 2-minute assessment
        </Button>
      </div>
    </section>
  );
}
