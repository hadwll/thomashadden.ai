import { PageShell } from '@/components/layout/PageShell';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as contentApi from '@/lib/content/api';
import type { PublicContentItem } from '@/lib/content/types';

type InsightDetailPageProps = {
  params: {
    slug: string;
  };
};

function formatPublishedDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

async function getInsightBySlug(slug: string): Promise<PublicContentItem> {
  try {
    const content = await contentApi.getInsightsContent({ slug });
    const sections = content.sections;
    const insight = sections.find((item) => item.slug === slug) ?? sections[0];

    if (!insight) {
      notFound();
    }

    return insight;
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      notFound();
    }

    throw error;
  }
}

export default async function InsightDetailPage({ params }: InsightDetailPageProps) {
  const insight = await getInsightBySlug(params.slug);
  const publishedDate = formatPublishedDate(insight.publishedAt ?? insight.updatedAt);

  return (
    <PageShell>
      <article className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Link href="/insights" className="text-sm font-medium text-text-secondary no-underline hover:text-accent-primary">
          ← Back to Insights
        </Link>

        <h1 className="mt-4 text-h2 font-bold text-text-primary">{insight.title}</h1>

        {publishedDate ? (
          <p className="mt-3 font-mono text-xs uppercase tracking-wide text-text-muted">Published {publishedDate}</p>
        ) : null}

        <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">{insight.summary}</p>
      </article>
    </PageShell>
  );
}
