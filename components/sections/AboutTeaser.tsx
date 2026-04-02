import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export type AboutTeaserProps = {
  paragraphs: string[];
  variant: 'desktop' | 'mobile';
};

export function AboutTeaser({ paragraphs, variant }: AboutTeaserProps) {
  if (variant === 'mobile') {
    return (
      <section>
        <Link
          href="/about"
          className="flex min-h-12 items-center justify-between border-b border-border-default px-1 py-3 text-base font-medium text-text-primary no-underline"
        >
          <span>About Thomas</span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    );
  }

  const teaserParagraphs = paragraphs.filter((paragraph) => paragraph.trim().length > 0).slice(0, 3);

  return (
    <section className="rounded-content border border-border-default bg-bg-surface/90 p-5 sm:p-6 lg:p-7">
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div className="space-y-4">
          <h2 className="text-h3 font-semibold text-text-primary">About Thomas</h2>

          {teaserParagraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-6 text-text-secondary sm:text-base">
              {paragraph}
            </p>
          ))}

          <Button href="/about" variant="secondary" size="sm">
            Learn more
          </Button>
        </div>

        <div className="flex justify-start md:justify-end">
          <div
            role="img"
            aria-label="Portrait of Thomas Hadden"
            className="h-40 w-full max-w-[220px] rounded-content border border-border-default bg-gradient-to-br from-bg-elevated to-bg-primary"
          />
        </div>
      </div>
    </section>
  );
}
