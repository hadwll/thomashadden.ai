import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

export default function ProjectsPage() {
  return (
    <PageShell>
      <RoutePlaceholder title="Projects" route="/projects" />
    </PageShell>
  );
}
