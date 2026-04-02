import type { PublicContentItem } from '@/lib/content/types';

export type LatestInsightsTeaserProps = {
  items: PublicContentItem[];
  variant: 'desktop' | 'mobile';
};

export function LatestInsightsTeaser(_props: LatestInsightsTeaserProps) {
  return <section data-testid="latest-insights-teaser-stub">not implemented</section>;
}
