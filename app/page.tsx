import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

export default function HomePage() {
  return (
    <PageShell>
      <RoutePlaceholder title="Home" route="/" />
    </PageShell>
  );
}
