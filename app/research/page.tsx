import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import * as contentApi from '@/lib/content/api';

export default async function ResearchPage() {
  const content = await contentApi.getResearchContent();

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-h2 font-bold text-text-primary">Research</h1>
        <div className="mt-6">
          <SectionHeader title="Current Themes and Collaboration Areas" />
        </div>

        {content.sections.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {content.sections.map((researchItem) => (
              <Card
                key={researchItem.id}
                variant="research"
                title={researchItem.title}
                summary={researchItem.summary}
                slug={researchItem.slug}
                imageUrl={researchItem.imageUrl}
                theme={researchItem.theme}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Research updates will appear here shortly.</p>
        )}
      </section>
    </PageShell>
  );
}
