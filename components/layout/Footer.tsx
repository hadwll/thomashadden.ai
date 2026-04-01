import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/contact', label: 'Contact' }
];

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-primary">
      <div className="mx-auto grid w-full max-w-content gap-3 px-4 py-5 sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6 lg:px-8">
        <p className="text-sm font-semibold text-text-primary">Thomas Hadden</p>

        <nav aria-label="Footer links" className="flex flex-wrap items-center gap-3.5 lg:justify-center">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-secondary no-underline transition-colors duration-normal hover:text-accent-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center lg:justify-end">
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
