import { PageShell } from '@/components/layout/PageShell';
import { ReadinessCheck } from '@/components/readiness/ReadinessCheck';

export default function ReadinessPage() {
  return (
    <PageShell hideNav>
      <ReadinessCheck />
    </PageShell>
  );
}
