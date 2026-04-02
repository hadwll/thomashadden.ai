import { render, screen, within } from '@testing-library/react';
import InsightsPage from '@/app/insights/page';
import * as contentApi from '@/lib/content/api';

vi.mock('@/lib/content/api', () => ({
  getInsightsContent: vi.fn()
}));

const INSIGHT_ITEMS = [
  {
    id: 'industrial-ai-roi',
    title: 'Where Industrial AI Delivers ROI First',
    slug: 'where-industrial-ai-delivers-roi-first',
    summary: 'Practical first-mile opportunities for measurable AI outcomes.',
    updatedAt: '2026-03-14T10:30:00Z',
    publishedAt: '2026-03-14T10:30:00Z',
    tags: ['AI', 'Industry']
  },
  {
    id: 'automation-decision-patterns',
    title: 'Automation Decision Patterns from the Field',
    slug: 'automation-decision-patterns-from-the-field',
    summary: 'Operational patterns observed across recent deployments.',
    updatedAt: '2026-03-15T10:30:00Z',
    publishedAt: '2026-03-15T10:30:00Z',
    tags: ['Automation']
  }
];

async function renderInsightsPage() {
  render(await InsightsPage());
}

describe('/insights list page contract', () => {
  beforeEach(() => {
    vi.mocked(contentApi.getInsightsContent).mockResolvedValue({
      page: 1,
      perPage: 10,
      total: INSIGHT_ITEMS.length,
      totalPages: 2,
      title: 'Insights',
      sections: INSIGHT_ITEMS,
      lastUpdated: '2026-03-15T10:30:00Z',
      pagination: {
        total: INSIGHT_ITEMS.length,
        page: 1,
        perPage: 10,
        totalPages: 2
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests paginated insights list data through SSR helper', async () => {
    await renderInsightsPage();

    expect(contentApi.getInsightsContent).toHaveBeenCalledWith({ page: 1, perPage: 10 });
  });

  it('renders Insights heading with one or more insight entries', async () => {
    await renderInsightsPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument();
    expect(within(main).getByText('Where Industrial AI Delivers ROI First')).toBeInTheDocument();
    expect(within(main).getByText('Automation Decision Patterns from the Field')).toBeInTheDocument();
  });

  it('renders each insight item as a link to /insights/[slug]', async () => {
    await renderInsightsPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('link', { name: /Where Industrial AI Delivers ROI First/i })).toHaveAttribute(
      'href',
      '/insights/where-industrial-ai-delivers-roi-first'
    );
    expect(within(main).getByRole('link', { name: /Automation Decision Patterns from the Field/i })).toHaveAttribute(
      'href',
      '/insights/automation-decision-patterns-from-the-field'
    );
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    await renderInsightsPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
