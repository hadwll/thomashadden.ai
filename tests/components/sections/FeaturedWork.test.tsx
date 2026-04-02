import { render, screen } from '@testing-library/react';
import { FeaturedWork } from '@/components/sections/FeaturedWork';
import type { PublicContentItem } from '@/lib/content/types';

const FEATURED_ITEMS: PublicContentItem[] = [
  {
    id: 'project-1',
    title: 'Hydropower Analytics Pipeline',
    slug: 'hydropower-analytics-pipeline',
    summary: 'Applied analytics for operational optimization.',
    updatedAt: '2026-03-01'
  },
  {
    id: 'project-2',
    title: 'Energy Retrofit Forecasting',
    slug: 'energy-retrofit-forecasting',
    summary: 'Forecasting model for retrofit planning.',
    updatedAt: '2026-03-02'
  },
  {
    id: 'project-3',
    title: 'Operations Health Dashboard',
    slug: 'operations-health-dashboard',
    summary: 'Executive operations and utilization dashboards.',
    updatedAt: '2026-03-03'
  },
  {
    id: 'project-4',
    title: 'Overflow Project Should Collapse',
    slug: 'overflow-project-should-collapse',
    summary: 'Used to verify homepage card limits.',
    updatedAt: '2026-03-04'
  }
];

function getChevronMarker() {
  return (
    screen.queryByText('→') ??
    screen.queryByLabelText(/chevron|row-end|open featured work/i)
  );
}

describe('FeaturedWork contract', () => {
  it('renders desktop heading, view-all navigation, and no more than three cards', () => {
    render(<FeaturedWork items={FEATURED_ITEMS} variant="desktop" />);

    expect(screen.getByRole('heading', { name: 'Featured Work' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all projects' })).toHaveAttribute('href', '/projects');

    for (const item of FEATURED_ITEMS.slice(0, 3)) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }

    expect(screen.queryByText(FEATURED_ITEMS[3].title)).not.toBeInTheDocument();

    const articleCards = screen.queryAllByRole('article');
    expect(articleCards.length).toBeGreaterThan(0);
    expect(articleCards.length).toBeLessThanOrEqual(3);
  });

  it('renders mobile as a single row-style link without inline cards', () => {
    render(<FeaturedWork items={FEATURED_ITEMS} variant="mobile" />);

    const mobileLinks = screen.getAllByRole('link', { name: /featured work/i });
    expect(mobileLinks).toHaveLength(1);
    expect(mobileLinks[0]).toHaveAttribute('href', '/projects');
    expect(getChevronMarker()).toBeInTheDocument();

    for (const item of FEATURED_ITEMS) {
      expect(screen.queryByText(item.title)).not.toBeInTheDocument();
    }
  });
});
