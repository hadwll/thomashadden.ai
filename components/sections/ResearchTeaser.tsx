import type { PublicContentItem } from '@/lib/content/types';

export type ResearchTeaserProps = {
  items: PublicContentItem[];
  variant: 'desktop' | 'mobile';
};

export function ResearchTeaser(_props: ResearchTeaserProps) {
  return <section data-testid="research-teaser-stub">not implemented</section>;
}
