import Link from 'next/link';
import { BrandMark } from '@/components/layout/BrandMark';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

type MobileHeaderProps = {
  currentPath: string;
};

export function MobileHeader({ currentPath: _currentPath }: MobileHeaderProps) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40 flex h-[50px] items-center justify-between border-b border-border-default bg-bg-surface/95 px-3.5 backdrop-blur lg:hidden"
    >
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary no-underline">
        <BrandMark />
        <span>Thomas Hadden</span>
      </Link>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Ask the AI assistant"
          className="inline-flex h-8 items-center rounded-pill bg-accent-primary px-3 text-xs font-semibold text-white transition-colors duration-normal hover:bg-accent-hover"
        >
          Ask
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
