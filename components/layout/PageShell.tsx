import type { ReactNode } from 'react';
import { Footer } from '@/components/layout/Footer';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { NavBar } from '@/components/layout/NavBar';

type PageShellProps = {
  children: ReactNode;
  hideNav?: boolean;
};

function getCurrentPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname || '/';
}

export function PageShell({ children, hideNav = false }: PageShellProps) {
  const currentPath = getCurrentPath();

  return (
    <div className="min-h-screen bg-bg-primary px-0 lg:px-4 lg:py-4">
      <div className="mx-auto flex min-h-screen w-full max-w-shell flex-col bg-bg-primary lg:min-h-0 lg:overflow-hidden lg:rounded-shell lg:border lg:border-border-default">
        {!hideNav ? <NavBar currentPath={currentPath} /> : null}
        <MobileHeader currentPath={currentPath} />

        <main
          data-testid="shell-main"
          className="shell-main flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"
        >
          <div data-testid="shell-main-content" className="shell-main-content flex h-full flex-col">
            {children}
          </div>
        </main>

        {!hideNav ? <MobileNav currentPath={currentPath} /> : null}
        <Footer />
      </div>
    </div>
  );
}
