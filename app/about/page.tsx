import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

export default function AboutPage() {
  return (
    <PageShell>
      <RoutePlaceholder title="About" route="/about" />
    </PageShell>
  );
}
