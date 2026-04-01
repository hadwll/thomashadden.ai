import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

export default function ReadinessPage() {
  return (
    <PageShell hideNav>
      <RoutePlaceholder title="AI Readiness Check" route="/readiness" />
    </PageShell>
  );
}
