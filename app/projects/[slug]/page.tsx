import { PageShell } from '@/components/layout/PageShell';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as contentApi from '@/lib/content/api';
import type { PublicContentItem } from '@/lib/content/types';

type ProjectDetailPageProps = {
  params: {
    slug: string;
  };
};

async function getProjectBySlug(slug: string): Promise<PublicContentItem> {
  try {
    const content = await contentApi.getProjectsContent({ slug });
    const project = content.sections.find((item) => item.slug === slug) ?? content.sections[0];

    if (!project) {
      notFound();
    }

    return project;
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      notFound();
    }

    throw error;
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const project = await getProjectBySlug(params.slug);

  return (
    <PageShell>
      <article className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Link href="/projects" className="text-sm font-medium text-text-secondary no-underline hover:text-accent-primary">
          ← Back to Projects
        </Link>

        <h1 className="mt-4 text-h2 font-bold text-text-primary">{project.title}</h1>
        <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">{project.summary}</p>

        <dl className="mt-6 grid gap-3 rounded-content border border-border-default bg-bg-surface/90 p-5 sm:grid-cols-2">
          {project.category ? (
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-text-muted">Category</dt>
              <dd className="mt-1 text-sm text-text-primary">{project.category}</dd>
            </div>
          ) : null}

          {project.status ? (
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-text-muted">Status</dt>
              <dd className="mt-1 text-sm text-text-primary">{project.status}</dd>
            </div>
          ) : null}
        </dl>
      </article>
    </PageShell>
  );
}
