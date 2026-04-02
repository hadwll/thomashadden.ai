import { Button } from '@/components/ui/Button';

export function HeroSection() {
  return (
    <section className="rounded-vessel border border-border-default bg-bg-surface/70 px-5 py-10 text-center backdrop-blur sm:px-8 sm:py-12 lg:px-14 lg:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
        <h1 className="text-hero font-semibold text-text-primary">Thomas Hadden</h1>
        <p className="text-base font-semibold text-accent-primary sm:text-lg">
          Industrial AI, Automation, and Research
        </p>

        <p className="flex flex-wrap items-center justify-center gap-3 text-sm text-text-secondary">
          <span>Park Electrical Belfast</span>
          <span aria-hidden="true" className="text-text-muted">
            |
          </span>
          <span>Industrial AI Research</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button href="#ask-thomas-ai" variant="primary" size="md">
            Explore AI
          </Button>
          <Button href="/projects" variant="secondary" size="md">
            View Projects
          </Button>
        </div>
      </div>
    </section>
  );
}
