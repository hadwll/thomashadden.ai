import { render, screen } from '@testing-library/react';
import { LatestInsightsTeaser } from '@/components/sections/LatestInsightsTeaser';
import type { PublicContentItem } from '@/lib/content/types';

const INSIGHT_ITEMS: PublicContentItem[] = [
  {
    id: 'insight-1',
    title: 'Agentic Workflow Patterns',
    slug: 'agentic-workflow-patterns',
    summary: 'Notes on practical orchestration patterns for AI systems.',
    updatedAt: '2026-01-15'
  },
  {
    id: 'insight-2',
    title: 'Industrial RAG Integration Checklist',
    slug: 'industrial-rag-integration-checklist',
    summary: 'Checklist for reliable retrieval grounded responses.',
    updatedAt: '2026-01-16'
  }
];

describe('LatestInsightsTeaser contract', () => {
  it('renders desktop heading, one or more insights, and a route to /insights', () => {
    render(<LatestInsightsTeaser items={INSIGHT_ITEMS} variant="desktop" />);

    expect(screen.getByRole('heading', { name: 'Latest Insights' })).toBeInTheDocument();

    const renderedCount = INSIGHT_ITEMS.filter((item) => screen.queryByText(item.title)).length;
    expect(renderedCount).toBeGreaterThanOrEqual(1);

    const insightsRouteLinks = screen
      .queryAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/insights');
    expect(insightsRouteLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders mobile as a single Latest Insights row and hides inline entries', () => {
    render(<LatestInsightsTeaser items={INSIGHT_ITEMS} variant="mobile" />);

    const mobileRows = screen.getAllByRole('link', { name: /latest insights/i });
    expect(mobileRows).toHaveLength(1);
    expect(mobileRows[0]).toHaveAttribute('href', '/insights');

    for (const item of INSIGHT_ITEMS) {
      expect(screen.queryByText(item.title)).not.toBeInTheDocument();
    }
  });
});
