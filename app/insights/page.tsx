import { PageShell } from '@/components/layout/PageShell';
import { InsightCard } from '@/components/ui/InsightCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import * as contentApi from '@/lib/content/api';

export default async function InsightsPage() {
  const content = await contentApi.getInsightsContent({ page: 1, perPage: 10 });
  const pagination = 'pagination' in content ? content.pagination : null;

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-h2 font-bold text-text-primary">Insights</h1>
        <div className="mt-6">
          <SectionHeader title="Field Notes and Practical AI Observations" />
        </div>

        {content.sections.length > 0 ? (
          <div className="grid gap-3">
            {content.sections.map((insight) => (
              <InsightCard
                key={insight.id}
                title={insight.title}
                summary={insight.summary}
                slug={insight.slug}
                tags={insight.tags}
                publishedAt={insight.publishedAt}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Insights will be published here soon.</p>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <p className="mt-5 text-sm text-text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </p>
        ) : null}
      </section>
    </PageShell>
  );
}
