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
      <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="text-sm font-semibold text-text-primary">Thomas Hadden</p>

        <nav aria-label="Footer links" className="flex flex-wrap items-center gap-4">
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

        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
