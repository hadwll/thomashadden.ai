import { render, screen, within } from '@testing-library/react';
import { MobileHeader } from '@/components/layout/MobileHeader';

describe('MobileHeader', () => {
  it('renders a banner landmark', () => {
    render(<MobileHeader currentPath="/" />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the Thomas Hadden wordmark', () => {
    render(<MobileHeader currentPath="/" />);

    expect(screen.getByText(/thomas hadden/i)).toBeInTheDocument();
  });

  it('renders a brand mark beside the wordmark', () => {
    render(<MobileHeader currentPath="/" />);

    const header = screen.getByRole('banner');

    expect(within(header).getByTestId('brand-mark')).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Thomas Hadden' })).toBeInTheDocument();
  });

  it('renders an Ask control with an accessible name', () => {
    render(<MobileHeader currentPath="/" />);

    expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument();
  });

  it('renders a theme toggle control in the header area', () => {
    render(<MobileHeader currentPath="/" />);

    expect(
      screen.getByRole('button', {
        name: /switch to (light|dark) mode/i
      })
    ).toBeInTheDocument();
  });

  it('does not render the full desktop nav link list in the mobile header', () => {
    render(<MobileHeader currentPath="/" />);

    for (const linkName of ['About', 'Projects', 'Research', 'Insights', 'Contact']) {
      expect(screen.queryByRole('link', { name: linkName })).not.toBeInTheDocument();
    }
  });
});
