import { render, screen } from '@testing-library/react';
import { ReadinessTeaser } from '@/components/sections/ReadinessTeaser';

function getReadinessCTA() {
  return (
    screen.queryByRole('link', { name: 'Start the 2-minute assessment' }) ??
    screen.queryByRole('button', { name: 'Start the 2-minute assessment' })
  );
}

describe('ReadinessTeaser contract', () => {
  it('renders desktop readiness strip structure and CTA', () => {
    render(<ReadinessTeaser variant="desktop" />);

    expect(screen.getByTestId('readiness-strip')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How AI-ready is your business?' })).toBeInTheDocument();
    expect(screen.getByText("Assess your company's AI potential.")).toBeInTheDocument();
    expect(getReadinessCTA()).toBeInTheDocument();
  });

  it('renders mobile readiness card structure with same primary copy and CTA', () => {
    render(<ReadinessTeaser variant="mobile" />);

    expect(screen.getByTestId('readiness-card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How AI-ready is your business?' })).toBeInTheDocument();
    expect(getReadinessCTA()).toBeInTheDocument();
  });
});
