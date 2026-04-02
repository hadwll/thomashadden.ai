import Link from 'next/link';
import { InsightCard } from '@/components/ui/InsightCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { PublicContentItem } from '@/lib/content/types';

export type LatestInsightsTeaserProps = {
  items: PublicContentItem[];
  variant: 'desktop' | 'mobile';
};

export function LatestInsightsTeaser({ items, variant }: LatestInsightsTeaserProps) {
  if (variant === 'mobile') {
    return (
      <section>
        <Link
          href="/insights"
          className="flex min-h-12 items-center justify-between border-b border-border-default px-1 py-3 text-base font-medium text-text-primary no-underline"
        >
          <span>Latest Insights</span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    );
  }

  const insightItems = items.slice(0, 3);

  return (
    <section>
      <SectionHeader title="Latest Insights" viewAllHref="/insights" viewAllLabel="View all" />
      <div className="grid gap-3">
        {insightItems.map((item) => (
          <InsightCard
            key={item.id}
            title={item.title}
            summary={item.summary}
            slug={item.slug}
            publishedAt={item.publishedAt}
            tags={item.tags}
          />
        ))}
      </div>
    </section>
  );
}
