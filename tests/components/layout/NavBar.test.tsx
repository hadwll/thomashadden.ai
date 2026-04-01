import { render, screen, within } from '@testing-library/react';
import { NavBar } from '@/components/layout/NavBar';

const DESKTOP_NAV_LINKS = ['Home', 'About', 'Projects', 'Research', 'Insights', 'Contact'] as const;

describe('NavBar', () => {
  it('renders a main navigation landmark', () => {
    render(<NavBar currentPath="/" />);

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('renders desktop nav links and Ask Thomas AI CTA', () => {
    render(<NavBar currentPath="/" />);

    for (const linkName of DESKTOP_NAV_LINKS) {
      expect(screen.getByRole('link', { name: linkName })).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: /ask thomas ai/i })).toBeInTheDocument();
  });

  it('renders a dedicated brand mark beside the Thomas Hadden wordmark', () => {
    render(<NavBar currentPath="/" />);

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });

    expect(within(nav).getByTestId('brand-mark')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Thomas Hadden' })).toBeInTheDocument();
  });

  it('marks the active route link with aria-current based on currentPath', () => {
    render(<NavBar currentPath="/research/agentic-workflows" />);

    expect(screen.getByRole('link', { name: 'Research' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('does not expose a visible theme toggle control on desktop homepage nav', () => {
    render(<NavBar currentPath="/" />);

    expect(
      screen.queryByRole('button', {
        name: /switch to (light|dark) mode/i
      })
    ).not.toBeInTheDocument();
  });
});
