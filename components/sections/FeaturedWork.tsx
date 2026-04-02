import type { PublicContentItem } from '@/lib/content/types';

export type FeaturedWorkProps = {
  items: PublicContentItem[];
  variant: 'desktop' | 'mobile';
};

export function FeaturedWork(_props: FeaturedWorkProps) {
  return <section data-testid="featured-work-stub">not implemented</section>;
}
