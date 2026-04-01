import Link from 'next/link';
import { BrandMark } from '@/components/layout/BrandMark';

type NavBarProps = {
  currentPath: string;
};

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/research', label: 'Research' },
  { href: '/insights', label: 'Insights' },
  { href: '/contact', label: 'Contact' }
];

function isActivePath(currentPath: string, href: string): boolean {
  if (href === '/') {
    return currentPath === '/';
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function NavBar({ currentPath }: NavBarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="hidden h-[62px] items-center justify-between border-b border-border-default bg-bg-surface/90 px-6 backdrop-blur lg:flex"
    >
      <Link
        href="/"
        className="inline-flex shrink-0 items-center gap-2.5 text-base font-semibold text-text-primary no-underline"
      >
        <BrandMark className="h-7 w-7" />
        <span>Thomas Hadden</span>
      </Link>

      <div className="flex items-center gap-6">
        {NAV_ITEMS.map((item) => {
          const isActive = isActivePath(currentPath, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`text-[15px] font-semibold no-underline transition-colors duration-normal ${
                isActive ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Ask Thomas AI"
        className="rounded-pill bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-normal hover:bg-accent-hover"
      >
        Ask Thomas AI
      </button>
    </nav>
  );
}
