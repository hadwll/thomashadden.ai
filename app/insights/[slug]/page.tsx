import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

type InsightDetailPageProps = {
  params: {
    slug: string;
  };
};

export default function InsightDetailPage({ params }: InsightDetailPageProps) {
  return (
    <PageShell>
      <RoutePlaceholder title="Insight Detail" route={`/insights/${params.slug}`} />
    </PageShell>
  );
}
