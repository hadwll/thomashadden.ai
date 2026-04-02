import { render, screen, within } from '@testing-library/react';
import InsightDetailPage from '@/app/insights/[slug]/page';
import * as contentApi from '@/lib/content/api';
import { notFound } from 'next/navigation';

vi.mock('@/lib/content/api', () => ({
  getInsightsContent: vi.fn()
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));

const INSIGHT_DETAIL = {
  id: 'where-industrial-ai-delivers-roi-first',
  title: 'Where Industrial AI Delivers ROI First',
  slug: 'where-industrial-ai-delivers-roi-first',
  summary: 'A practical field note on where applied AI creates early operational value.',
  updatedAt: '2026-03-15T10:30:00Z',
  publishedAt: '2026-03-15T10:30:00Z',
  tags: ['AI', 'Industry']
};

async function renderInsightDetail(slug: string) {
  render(await InsightDetailPage({ params: { slug } }));
}

describe('/insights/[slug] detail page contract', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts slug params and fetches insight detail through SSR helper', async () => {
    vi.mocked(contentApi.getInsightsContent).mockResolvedValue({
      page: 'insights',
      title: 'Insights',
      sections: [INSIGHT_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderInsightDetail('where-industrial-ai-delivers-roi-first');

    expect(contentApi.getInsightsContent).toHaveBeenCalledWith({ slug: 'where-industrial-ai-delivers-roi-first' });
  });

  it('renders title, summary/body, published metadata, and back link to /insights', async () => {
    vi.mocked(contentApi.getInsightsContent).mockResolvedValue({
      page: 'insights',
      title: 'Insights',
      sections: [INSIGHT_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderInsightDetail('where-industrial-ai-delivers-roi-first');

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('heading', { level: 1, name: INSIGHT_DETAIL.title })).toBeInTheDocument();
    expect(within(main).getByText(INSIGHT_DETAIL.summary)).toBeInTheDocument();
    expect(within(main).getByText(/2026|Mar|March/i)).toBeInTheDocument();
    expect(within(main).getByRole('link', { name: /back/i })).toHaveAttribute('href', '/insights');
  });

  it('routes missing slugs to notFound()-style handling', async () => {
    vi.mocked(contentApi.getInsightsContent).mockResolvedValue({
      page: 'insights',
      title: 'Insights',
      sections: [],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await expect(renderInsightDetail('missing-insight')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    vi.mocked(contentApi.getInsightsContent).mockResolvedValue({
      page: 'insights',
      title: 'Insights',
      sections: [INSIGHT_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderInsightDetail('where-industrial-ai-delivers-roi-first');

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
