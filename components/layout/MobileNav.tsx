import Link from 'next/link';

type MobileNavProps = {
  currentPath: string;
};

type MobileNavItem = {
  href: string;
  label: string;
};

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { href: '/', label: 'Home' },
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

export function MobileNav({ currentPath }: MobileNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-bg-surface lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-content grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = isActivePath(currentPath, item.href);

          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-11 w-full items-center justify-center text-center text-[11px] font-medium no-underline transition-colors duration-normal ${
                  isActive ? 'text-accent-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
