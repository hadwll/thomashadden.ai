import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

type ResearchDetailPageProps = {
  params: {
    slug: string;
  };
};

export default function ResearchDetailPage({ params }: ResearchDetailPageProps) {
  return (
    <PageShell>
      <RoutePlaceholder title="Research Detail" route={`/research/${params.slug}`} />
    </PageShell>
  );
}
