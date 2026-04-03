import type { ReactNode } from 'react';

export type AuthGateProps = {
  onLinkedIn?: () => void | Promise<void>;
  onEmail?: (email: string) => void | Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  isAuthenticatedSession?: boolean;
  children?: ReactNode;
};

export function AuthGate(_props: AuthGateProps) {
  return (
    <section data-testid="auth-gate-stub">
      <p>AuthGate placeholder</p>
    </section>
  );
}
