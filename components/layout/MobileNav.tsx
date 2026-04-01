import Link from 'next/link';

type MobileNavProps = {
  currentPath: string;
};

type IconProps = {
  className?: string;
};

function HomeIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 10.5L12 4l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 10v9h9v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectsIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" strokeLinecap="round" />
      <path d="M9 4.5v5" strokeLinecap="round" />
    </svg>
  );
}

function ResearchIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

function InsightsIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 18.5h16" strokeLinecap="round" />
      <path d="M7 16V9.5" strokeLinecap="round" />
      <path d="M12 16V6.5" strokeLinecap="round" />
      <path d="M17 16v-4.5" strokeLinecap="round" />
    </svg>
  );
}

function ContactIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="4" y="5.5" width="16" height="13" rx="2.5" />
      <path d="M4.5 7l7.5 6 7.5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type MobileNavItem = {
  href: string;
  label: string;
  Icon: (props: IconProps) => ReturnType<typeof HomeIcon>;
};

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/projects', label: 'Projects', Icon: ProjectsIcon },
  { href: '/research', label: 'Research', Icon: ResearchIcon },
  { href: '/insights', label: 'Insights', Icon: InsightsIcon },
  { href: '/contact', label: 'Contact', Icon: ContactIcon }
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-[68px] max-w-content grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = isActivePath(currentPath, item.href);

          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-center text-[11px] font-medium leading-none no-underline transition-colors duration-normal ${
                  isActive ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span aria-hidden="true" data-testid="mobile-nav-icon" className="inline-flex">
                  <item.Icon className="h-[18px] w-[18px]" />
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
