import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { PublicContentItem } from '@/lib/content/types';

export type ResearchTeaserProps = {
  items: PublicContentItem[];
  variant: 'desktop' | 'mobile';
};

export function ResearchTeaser({ items, variant }: ResearchTeaserProps) {
  if (variant === 'mobile') {
    return (
      <section>
        <Link
          href="/research"
          className="flex min-h-12 items-center justify-between border-b border-border-default px-1 py-3 text-base font-medium text-text-primary no-underline"
        >
          <span>Current Research</span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    );
  }

  const researchItems = items.slice(0, 3);

  return (
    <section>
      <SectionHeader title="Research" viewAllHref="/research" viewAllLabel="View all" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {researchItems.map((item) => (
          <Card
            key={item.id}
            variant="research"
            title={item.title}
            summary={item.summary}
            slug={item.slug}
            imageUrl={item.imageUrl}
            theme={item.theme}
          />
        ))}
      </div>
    </section>
  );
}
