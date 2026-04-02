import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import * as contentApi from '@/lib/content/api';

export default async function ProjectsPage() {
  const content = await contentApi.getProjectsContent();

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-h2 font-bold text-text-primary">Projects</h1>
        <div className="mt-6">
          <SectionHeader title="Featured and Recent Work" />
        </div>

        {content.sections.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {content.sections.map((project) => (
              <Card
                key={project.id}
                variant="project"
                title={project.title}
                summary={project.summary}
                slug={project.slug}
                imageUrl={project.imageUrl}
                category={project.category}
                location={project.location}
                status={project.status}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Projects will appear here shortly.</p>
        )}
      </section>
    </PageShell>
  );
}
