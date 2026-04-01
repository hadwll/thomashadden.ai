import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

export default function CookiesPage() {
  return (
    <PageShell>
      <RoutePlaceholder title="Cookie Policy" route="/cookies" />
    </PageShell>
  );
}
