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
  id: 'bearing-fault-detection-wavelet',
  title: 'Bearing Fault Detection Using Wavelet Methods and Machine Learning',
  slug: 'bearing-fault-detection-wavelet',
  summary:
    'Research into detecting roller element bearing faults using wavelet decomposition and unsupervised machine learning.',
  updatedAt: '2026-03-15T10:30:00Z',
  theme: 'Applied AI'
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

    await renderResearchDetail('bearing-fault-detection-wavelet');

    expect(contentApi.getResearchContent).toHaveBeenCalledWith({ slug: 'bearing-fault-detection-wavelet' });
  });

  it('renders title, detail copy, and a back link to /research', async () => {
    vi.mocked(contentApi.getResearchContent).mockResolvedValue({
      page: 'research',
      title: 'Research',
      sections: [RESEARCH_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderResearchDetail('bearing-fault-detection-wavelet');

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

    await renderResearchDetail('bearing-fault-detection-wavelet');

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
