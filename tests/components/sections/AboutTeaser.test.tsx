import { render, screen } from '@testing-library/react';
import { AboutTeaser } from '@/components/sections/AboutTeaser';

const ABOUT_PARAGRAPHS = [
  'Thomas leads industrial AI work grounded in engineering operations.',
  'He contributes through Park Electrical Belfast and connected automation delivery.',
  'Current focus includes practical AI adoption and decision-support tooling.',
  'This fourth paragraph ensures desktop truncates to a 2-3 paragraph teaser.'
];

function getLearnMoreControl() {
  return screen.queryByRole('link', { name: /learn more/i }) ?? screen.queryByRole('button', { name: /learn more/i });
}

describe('AboutTeaser contract', () => {
  it('renders desktop heading, teaser paragraphs, CTA route, and portrait slot', () => {
    render(<AboutTeaser paragraphs={ABOUT_PARAGRAPHS} variant="desktop" />);

    expect(screen.getByRole('heading', { name: 'About Thomas' })).toBeInTheDocument();

    const renderedParagraphCount = ABOUT_PARAGRAPHS.filter((paragraph) => screen.queryByText(paragraph)).length;
    expect(renderedParagraphCount).toBeGreaterThanOrEqual(2);
    expect(renderedParagraphCount).toBeLessThanOrEqual(3);

    const learnMore = getLearnMoreControl();
    expect(learnMore).toBeInTheDocument();

    if (learnMore?.tagName.toLowerCase() === 'a') {
      expect(learnMore).toHaveAttribute('href', '/about');
    }

    expect(screen.getByRole('img', { name: /thomas|portrait|about/i })).toBeInTheDocument();
  });

  it('renders mobile as a single row-style link and omits desktop paragraph stack', () => {
    render(<AboutTeaser paragraphs={ABOUT_PARAGRAPHS} variant="mobile" />);

    const mobileRows = screen.getAllByRole('link', { name: /about thomas/i });
    expect(mobileRows).toHaveLength(1);
    expect(mobileRows[0]).toHaveAttribute('href', '/about');

    for (const paragraph of ABOUT_PARAGRAPHS) {
      expect(screen.queryByText(paragraph)).not.toBeInTheDocument();
    }
  });
});
