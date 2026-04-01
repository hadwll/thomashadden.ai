import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

export default function PrivacyPage() {
  return (
    <PageShell>
      <RoutePlaceholder title="Privacy Policy" route="/privacy" />
    </PageShell>
  );
}
