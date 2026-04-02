import Link from 'next/link';

export type InsightCardProps = {
  title: string;
  summary: string;
  slug: string;
  tags?: string[];
  publishedAt?: string;
};

export function InsightCard({ title, summary, slug, tags, publishedAt }: InsightCardProps) {
  return (
    <Link
      href={`/insights/${slug}`}
      className="block rounded-content border border-border-default bg-bg-surface p-5 no-underline shadow-card transition-all duration-normal hover:-translate-y-0.5 hover:border-border-accent"
    >
      <article className="space-y-3">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm leading-6 text-text-secondary">{summary}</p>

        {tags && tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Insight tags">
            {tags.slice(0, 3).map((tag) => (
              <li key={tag} className="rounded-pill bg-accent-subtle px-2.5 py-1 text-xs text-text-secondary">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {publishedAt ? (
          <p className="font-mono text-xs uppercase tracking-wide text-text-muted">{publishedAt}</p>
        ) : null}
      </article>
    </Link>
  );
}
