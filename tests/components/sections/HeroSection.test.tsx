import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/sections/HeroSection';

function getControlByName(name: string) {
  return screen.queryByRole('button', { name }) ?? screen.queryByRole('link', { name });
}

describe('HeroSection contract', () => {
  it('renders homepage hero heading, metadata, and CTA controls', () => {
    render(<HeroSection />);

    expect(screen.getByRole('heading', { level: 1, name: 'Thomas Hadden' })).toBeInTheDocument();
    expect(screen.getByText('Industrial AI, Automation, and Research')).toBeInTheDocument();
    expect(screen.getByText('Park Electrical Belfast')).toBeInTheDocument();
    expect(screen.getByText('Industrial AI Research')).toBeInTheDocument();
    expect(getControlByName('Explore AI')).toBeInTheDocument();
    expect(getControlByName('View Projects')).toBeInTheDocument();
  });
});
