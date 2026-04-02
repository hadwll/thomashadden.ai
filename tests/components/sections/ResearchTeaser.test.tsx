import { render, screen } from '@testing-library/react';
import { ResearchTeaser } from '@/components/sections/ResearchTeaser';
import type { PublicContentItem } from '@/lib/content/types';

const RESEARCH_ITEMS: PublicContentItem[] = [
  {
    id: 'research-1',
    title: 'Predictive Maintenance Cohort Study',
    slug: 'predictive-maintenance-cohort-study',
    summary: 'Industrial maintenance prediction research.',
    updatedAt: '2026-02-10'
  },
  {
    id: 'research-2',
    title: 'Data Quality in OT Systems',
    slug: 'data-quality-in-ot-systems',
    summary: 'Practical data hygiene impacts on AI programs.',
    updatedAt: '2026-02-11'
  },
  {
    id: 'research-3',
    title: 'Energy Control Loop Optimization',
    slug: 'energy-control-loop-optimization',
    summary: 'Research on control loop gains with ML support.',
    updatedAt: '2026-02-12'
  },
  {
    id: 'research-4',
    title: 'Overflow Research Item',
    slug: 'overflow-research-item',
    summary: 'Used to verify desktop teaser cap.',
    updatedAt: '2026-02-13'
  }
];

describe('ResearchTeaser contract', () => {
  it('renders desktop heading, /research navigation, and 2-3 teaser entries', () => {
    render(<ResearchTeaser items={RESEARCH_ITEMS} variant="desktop" />);

    expect(screen.getByRole('heading', { name: 'Research' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/research');

    const renderedCount = RESEARCH_ITEMS.filter((item) => screen.queryByText(item.title)).length;
    expect(renderedCount).toBeGreaterThanOrEqual(2);
    expect(renderedCount).toBeLessThanOrEqual(3);
  });

  it('renders mobile as a single Current Research row and hides inline cards', () => {
    render(<ResearchTeaser items={RESEARCH_ITEMS} variant="mobile" />);

    const mobileRows = screen.getAllByRole('link', { name: /current research/i });
    expect(mobileRows).toHaveLength(1);
    expect(mobileRows[0]).toHaveAttribute('href', '/research');

    for (const item of RESEARCH_ITEMS) {
      expect(screen.queryByText(item.title)).not.toBeInTheDocument();
    }
  });
});
