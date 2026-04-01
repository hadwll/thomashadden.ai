import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

export default function InsightsPage() {
  return (
    <PageShell>
      <RoutePlaceholder title="Insights" route="/insights" />
    </PageShell>
  );
}
