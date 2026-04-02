import { Button } from '@/components/ui/Button';

export type LLMInterfaceProps = {
  variant: 'homepage' | 'standalone';
};

const PROMPTS = [
  'How can AI help an engineering business?',
  'What is Thomas working on?',
  'Where does AI fit into industry?',
  'What is RAG?'
];

export function LLMInterface({ variant }: LLMInterfaceProps) {
  const baseClassName =
    variant === 'homepage'
      ? 'rounded-vessel border border-border-accent bg-bg-surface/90 p-4 shadow-card sm:p-6 lg:p-7'
      : 'rounded-content border border-border-default bg-bg-surface p-4 shadow-card sm:p-6';

  return (
    <section
      id={variant === 'homepage' ? 'ask-thomas-ai' : undefined}
      data-testid={variant === 'homepage' ? 'home-llm-shell' : 'standalone-llm-shell'}
      className={baseClassName}
      aria-label="AI assistant"
    >
      <div className="space-y-5">
        <header className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Targeted answers on AI, industry, and my work</h2>
          <p className="text-sm text-text-secondary">
            Ask a focused question and explore practical directions in automation, research, and deployment.
          </p>
        </header>

        <div className="rounded-pill border border-border-default bg-bg-primary/75 px-2 py-2 sm:px-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value="Where does AI fit into industry?"
              aria-label="AI prompt placeholder"
              className="h-10 flex-1 border-0 bg-transparent px-3 text-sm text-text-secondary outline-none"
            />
            <Button variant="primary" size="sm" type="button" ariaLabel="Ask" disabled>
              Ask
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-pill border border-border-default bg-bg-primary px-3 py-1.5 text-xs text-text-secondary"
            >
              {prompt}
            </button>
          ))}
        </div>

        <article className="rounded-content border border-border-default bg-bg-primary/80 p-4">
          <h3 className="text-sm font-semibold text-text-primary">How can AI help an engineering business?</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
            <li>Prioritize repetitive workflows where automation reduces admin load.</li>
            <li>Use retrieval-backed assistants to improve technical knowledge reuse.</li>
            <li>Introduce visibility dashboards to support faster operational decisions.</li>
            <li>Phase delivery by risk and measurable impact, not by novelty.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
