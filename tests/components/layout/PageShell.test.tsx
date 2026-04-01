import { render, screen } from '@testing-library/react';
import { PageShell } from '@/components/layout/PageShell';
import { RoutePlaceholder } from '@/components/layout/RoutePlaceholder';

describe('PageShell', () => {
  it('renders child content inside the shell container', () => {
    render(
      <PageShell>
        <p>Shell child content</p>
      </PageShell>
    );

    expect(screen.getByText('Shell child content')).toBeInTheDocument();
  });

  it('includes desktop and mobile shell chrome by default', () => {
    render(
      <PageShell>
        <p>Default shell composition</p>
      </PageShell>
    );

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });

  it('keeps mobile shell content wrapped with compact spacing hooks', () => {
    render(
      <PageShell>
        <RoutePlaceholder title="Contact" route="/contact" />
      </PageShell>
    );

    const shellMain = screen.getByTestId('shell-main');
    const contentWrapper = screen.getByTestId('shell-main-content');

    expect(shellMain).toBeInTheDocument();
    expect(contentWrapper).toBeInTheDocument();
    expect(shellMain).toContainElement(contentWrapper);
  });

  it('omits NavBar and MobileNav when hideNav is true', () => {
    render(
      <PageShell hideNav>
        <p>Readiness shell</p>
      </PageShell>
    );

    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  });

  it('preserves child content when hideNav is true', () => {
    render(
      <PageShell hideNav>
        <p>Child content remains visible</p>
      </PageShell>
    );

    expect(screen.getByText('Child content remains visible')).toBeInTheDocument();
  });

  it('can wrap route placeholder page content without throwing', () => {
    expect(() => {
      render(
        <PageShell>
          <RoutePlaceholder title="Projects" route="/projects" />
        </PageShell>
      );
    }).not.toThrow();

    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
  });
});
