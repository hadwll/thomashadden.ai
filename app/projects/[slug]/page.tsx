import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

type ProjectDetailPageProps = {
  params: {
    slug: string;
  };
};

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  return (
    <PageShell>
      <RoutePlaceholder title="Project Detail" route={`/projects/${params.slug}`} />
    </PageShell>
  );
}
