import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { PublicContentItem } from '@/lib/content/types';

export type FeaturedWorkProps = {
  items: PublicContentItem[];
  variant: 'desktop' | 'mobile';
};

export function FeaturedWork({ items, variant }: FeaturedWorkProps) {
  if (variant === 'mobile') {
    return (
      <section>
        <Link
          href="/projects"
          className="flex min-h-12 items-center justify-between border-b border-border-default px-1 py-3 text-base font-medium text-text-primary no-underline"
        >
          <span>Featured Work</span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    );
  }

  const featuredItems = items.slice(0, 3);

  return (
    <section>
      <SectionHeader title="Featured Work" viewAllHref="/projects" viewAllLabel="View all projects" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featuredItems.map((item) => (
          <Card
            key={item.id}
            variant="project"
            title={item.title}
            summary={item.summary}
            slug={item.slug}
            imageUrl={item.imageUrl}
            category={item.category}
            location={item.location}
          />
        ))}
      </div>
    </section>
  );
}
