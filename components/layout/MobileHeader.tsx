import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

type MobileHeaderProps = {
  currentPath: string;
};

export function MobileHeader({ currentPath: _currentPath }: MobileHeaderProps) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border-default bg-bg-surface/95 px-4 backdrop-blur lg:hidden"
    >
      <Link href="/" className="text-sm font-semibold text-text-primary no-underline">
        Thomas Hadden
      </Link>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Ask the AI assistant"
          className="rounded-pill bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-normal hover:bg-accent-hover"
        >
          Ask
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
