import { PageShell } from '@/components/layout/PageShell';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as contentApi from '@/lib/content/api';
import type { PublicContentItem } from '@/lib/content/types';

type ResearchDetailPageProps = {
  params: {
    slug: string;
  };
};

async function getResearchBySlug(slug: string): Promise<PublicContentItem> {
  try {
    const content = await contentApi.getResearchContent({ slug });
    const research = content.sections.find((item) => item.slug === slug) ?? content.sections[0];

    if (!research) {
      notFound();
    }

    return research;
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      notFound();
    }

    throw error;
  }
}

export default async function ResearchDetailPage({ params }: ResearchDetailPageProps) {
  const research = await getResearchBySlug(params.slug);

  return (
    <PageShell>
      <article className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Link href="/research" className="text-sm font-medium text-text-secondary no-underline hover:text-accent-primary">
          ← Back to Research
        </Link>

        <h1 className="mt-4 text-h2 font-bold text-text-primary">{research.title}</h1>
        <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">{research.summary}</p>

        {research.theme ? (
          <p className="mt-6 font-mono text-xs uppercase tracking-wide text-text-muted">{research.theme}</p>
        ) : null}
      </article>
    </PageShell>
  );
}
