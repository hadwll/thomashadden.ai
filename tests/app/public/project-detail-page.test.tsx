import { render, screen, within } from '@testing-library/react';
import ProjectDetailPage from '@/app/projects/[slug]/page';
import * as contentApi from '@/lib/content/api';
import { notFound } from 'next/navigation';

vi.mock('@/lib/content/api', () => ({
  getProjectsContent: vi.fn()
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));

const PROJECT_DETAIL = {
  id: 'predictive-maintenance-platform',
  title: 'Predictive Maintenance Platform',
  slug: 'predictive-maintenance-platform',
  summary: 'Detailed architecture and deployment notes for predictive maintenance.',
  updatedAt: '2026-03-15T10:30:00Z',
  category: 'Industrial AI',
  status: 'active'
};

async function renderProjectDetail(slug: string) {
  render(await ProjectDetailPage({ params: { slug } }));
}

describe('/projects/[slug] detail page contract', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts slug params and fetches project detail through SSR helper', async () => {
    vi.mocked(contentApi.getProjectsContent).mockResolvedValue({
      page: 'projects',
      title: 'Projects',
      sections: [PROJECT_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderProjectDetail('predictive-maintenance-platform');

    expect(contentApi.getProjectsContent).toHaveBeenCalledWith({ slug: 'predictive-maintenance-platform' });
  });

  it('renders title, detail content, metadata surface, and back link to /projects', async () => {
    vi.mocked(contentApi.getProjectsContent).mockResolvedValue({
      page: 'projects',
      title: 'Projects',
      sections: [PROJECT_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderProjectDetail('predictive-maintenance-platform');

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('heading', { level: 1, name: PROJECT_DETAIL.title })).toBeInTheDocument();
    expect(within(main).getByText(PROJECT_DETAIL.summary)).toBeInTheDocument();
    expect(within(main).getByText(PROJECT_DETAIL.category as string)).toBeInTheDocument();
    expect(within(main).getByText(PROJECT_DETAIL.status as string)).toBeInTheDocument();
    expect(within(main).getByRole('link', { name: /back/i })).toHaveAttribute('href', '/projects');
  });

  it('routes missing slugs to notFound()-style handling', async () => {
    vi.mocked(contentApi.getProjectsContent).mockResolvedValue({
      page: 'projects',
      title: 'Projects',
      sections: [],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await expect(renderProjectDetail('missing-project')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    vi.mocked(contentApi.getProjectsContent).mockResolvedValue({
      page: 'projects',
      title: 'Projects',
      sections: [PROJECT_DETAIL],
      lastUpdated: '2026-03-15T10:30:00Z'
    });

    await renderProjectDetail('predictive-maintenance-platform');

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
