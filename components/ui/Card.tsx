import type { ReactNode } from 'react';
import Link from 'next/link';

type CardVariant = 'project' | 'research' | 'insight';

export type CardProps = {
  variant: CardVariant;
  title: string;
  summary: string;
  slug: string;
  imageUrl?: string;
  tags?: string[];
  category?: string;
  status?: string;
  location?: string;
  publishedAt?: string;
  theme?: string;
  href?: string;
  meta?: ReactNode;
};

function resolveHref(variant: CardVariant, slug: string, href?: string): string {
  if (href) {
    return href;
  }

  if (variant === 'project') {
    return `/projects/${slug}`;
  }

  if (variant === 'research') {
    return `/research/${slug}`;
  }

  return `/insights/${slug}`;
}

function getMetaLine({
  variant,
  category,
  location,
  theme,
  publishedAt
}: {
  variant: CardVariant;
  category?: string;
  location?: string;
  theme?: string;
  publishedAt?: string;
}): string | null {
  if (variant === 'project') {
    return location ?? category ?? null;
  }

  if (variant === 'research') {
    return theme ?? null;
  }

  if (publishedAt) {
    return publishedAt;
  }

  return null;
}

export function Card({
  variant,
  title,
  summary,
  slug,
  imageUrl,
  tags,
  category,
  location,
  publishedAt,
  theme,
  href,
  meta
}: CardProps) {
  const cardHref = resolveHref(variant, slug, href);
  const metaLine = getMetaLine({
    variant,
    category,
    location,
    theme,
    publishedAt
  });

  const hasImage = variant !== 'insight';

  return (
    <Link
      href={cardHref}
      className="group block rounded-content border border-border-default bg-bg-surface no-underline shadow-card transition-all duration-normal hover:-translate-y-0.5 hover:border-border-accent"
    >
      <article className="h-full overflow-hidden rounded-content">
        {hasImage ? (
          <div className="aspect-[16/9] w-full bg-bg-elevated">
            {imageUrl ? (
              <img src={imageUrl} alt={`${title} preview image`} className="h-full w-full object-cover" />
            ) : (
              <div
                role="img"
                aria-label={`${title} preview image`}
                className="flex h-full w-full items-center justify-center text-sm font-medium text-text-muted"
              >
                Preview image
              </div>
            )}
          </div>
        ) : null}

        <div className="space-y-3 p-5">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="text-sm leading-6 text-text-secondary">{summary}</p>

          {meta ? <div>{meta}</div> : null}

          {metaLine ? <p className="font-mono text-xs uppercase tracking-wide text-text-muted">{metaLine}</p> : null}

          {variant === 'insight' && tags && tags.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Insight tags">
              {tags.slice(0, 3).map((tag) => (
                <li key={tag} className="rounded-pill bg-accent-subtle px-2.5 py-1 text-xs text-text-secondary">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
