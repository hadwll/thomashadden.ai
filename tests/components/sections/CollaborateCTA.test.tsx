import { render, screen } from '@testing-library/react';
import { CollaborateCTA } from '@/components/sections/CollaborateCTA';

describe('CollaborateCTA contract', () => {
  it('renders a mobile-home terminal row CTA to /contact', () => {
    render(<CollaborateCTA />);

    expect(screen.getByTestId('collaborate-row')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Collaborate on Research' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/contact');
  });
});
