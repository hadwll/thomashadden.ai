import { render, screen, within } from '@testing-library/react';
import ResearchDetailPage from '@/app/research/[slug]/page';
import * as contentApi from '@/lib/content/api';
import { notFound } from 'next/navigation';

vi.mock('@/lib/content/api', () => ({
  getResearchContent: vi.fn()
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));

const RESEARCH_DETAIL = {
  id: 'agentic-operations-industrial-control',
  title: 'Agentic Operations in Industrial Control',
  slug: 'agentic-operations-industrial-control',
  summary: 'Detailed findings from reliability-focused industrial R&D work.',
  updatedAt: '2026-03-15T10:30:00Z',
  theme: 'Industrial Automation'
};

async function renderResearchDetail(slug: string) {
  render(await ResearchDetailPage({ params: { slug } }));
}

describe('/research/[slug] detail page contract', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts slug params and fetches research detail through SSR helper', async () => {
    vi.mocked(contentApi.getResearchContent).mockResolvedValue({
      page: 'research',
      title: 'Research',
      sections: [RESEARCH_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderResearchDetail('agentic-operations-industrial-control');

    expect(contentApi.getResearchContent).toHaveBeenCalledWith({ slug: 'agentic-operations-industrial-control' });
  });

  it('renders title, detail copy, and a back link to /research', async () => {
    vi.mocked(contentApi.getResearchContent).mockResolvedValue({
      page: 'research',
      title: 'Research',
      sections: [RESEARCH_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderResearchDetail('agentic-operations-industrial-control');

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('heading', { level: 1, name: RESEARCH_DETAIL.title })).toBeInTheDocument();
    expect(within(main).getByText(RESEARCH_DETAIL.summary)).toBeInTheDocument();
    expect(within(main).getByText(RESEARCH_DETAIL.theme as string)).toBeInTheDocument();
    expect(within(main).getByRole('link', { name: /back/i })).toHaveAttribute('href', '/research');
  });

  it('routes missing slugs to notFound()-style handling', async () => {
    vi.mocked(contentApi.getResearchContent).mockResolvedValue({
      page: 'research',
      title: 'Research',
      sections: [],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await expect(renderResearchDetail('missing-research')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    vi.mocked(contentApi.getResearchContent).mockResolvedValue({
      page: 'research',
      title: 'Research',
      sections: [RESEARCH_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderResearchDetail('agentic-operations-industrial-control');

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
