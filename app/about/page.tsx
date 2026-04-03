import { PageShell } from '@/components/layout/PageShell';
import * as contentApi from '@/lib/content/api';

export const dynamic = 'force-dynamic';

function getAboutParagraphs(summary: string): string[] {
  return summary
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export default async function AboutPage() {
  const content = await contentApi.getAboutContent();
  const sections = content.sections;

  const paragraphs = sections.flatMap((section) => getAboutParagraphs(section.summary));
  const fallbackParagraph = 'Thomas Hadden works across industrial AI, automation, and practical engineering outcomes.';

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-content px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-content border border-border-default bg-bg-surface/90 p-6 sm:p-8">
          <h1 className="text-h2 font-bold text-text-primary">About</h1>

          <div className="mt-5 space-y-4">
            {(paragraphs.length > 0 ? paragraphs : [fallbackParagraph]).map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-text-secondary sm:text-base">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
