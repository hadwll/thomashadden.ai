import { render, screen, within } from '@testing-library/react';
import { MobileNav } from '@/components/layout/MobileNav';

const MOBILE_ITEMS = ['Home', 'Projects', 'Research', 'Insights', 'Contact'] as const;

describe('MobileNav', () => {
  it('renders a mobile navigation landmark', () => {
    render(<MobileNav currentPath="/" />);

    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });

  it('renders exactly the expected five mobile items', () => {
    render(<MobileNav currentPath="/" />);

    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    const links = within(nav).getAllByRole('link');

    expect(links).toHaveLength(5);

    for (const itemName of MOBILE_ITEMS) {
      expect(within(nav).getByRole('link', { name: itemName })).toBeInTheDocument();
    }
  });

  it('renders an icon above each mobile nav label', () => {
    render(<MobileNav currentPath="/" />);

    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });

    for (const itemName of MOBILE_ITEMS) {
      const link = within(nav).getByRole('link', { name: itemName });
      expect(within(link).getByTestId('mobile-nav-icon')).toBeInTheDocument();
      expect(within(link).getByText(itemName)).toBeInTheDocument();
    }
  });

  it('does not include About in mobile bottom navigation', () => {
    render(<MobileNav currentPath="/" />);

    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();
  });

  it('marks the active item with aria-current based on currentPath', () => {
    render(<MobileNav currentPath="/insights/2026-trends" />);

    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('keeps inactive items present and queryable by accessible name', () => {
    render(<MobileNav currentPath="/projects" />);

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');

    for (const itemName of ['Home', 'Research', 'Insights', 'Contact']) {
      expect(screen.getByRole('link', { name: itemName })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: itemName })).not.toHaveAttribute('aria-current', 'page');
    }
  });

  it('uses browser pathname fallback when currentPath remains server-default', async () => {
    window.history.pushState({}, '', '/contact');

    render(<MobileNav currentPath="/" />);

    expect(await screen.findByRole('link', { name: 'Contact' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current', 'page');
  });
});
