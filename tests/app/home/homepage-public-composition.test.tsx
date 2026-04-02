import { render, screen, within } from '@testing-library/react';
import HomePage from '@/app/page';
import type { PublicContentItem } from '@/lib/content/types';

const HOME_ITEMS: PublicContentItem[] = [
  {
    id: 'home-1',
    title: 'Featured Item One',
    slug: 'featured-item-one',
    summary: 'Fixture content for home composition tests.',
    updatedAt: '2026-02-20'
  },
  {
    id: 'home-2',
    title: 'Featured Item Two',
    slug: 'featured-item-two',
    summary: 'Fixture content for home composition tests.',
    updatedAt: '2026-02-21'
  },
  {
    id: 'home-3',
    title: 'Featured Item Three',
    slug: 'featured-item-three',
    summary: 'Fixture content for home composition tests.',
    updatedAt: '2026-02-22'
  }
];

vi.mock('@/lib/content/api', () => ({
  getHomeContent: vi.fn(async () => ({
    page: 'home',
    title: 'Home',
    sections: HOME_ITEMS,
    lastUpdated: '2026-02-28'
  })),
  getProjectsContent: vi.fn(async () => ({
    page: 'projects',
    title: 'Projects',
    sections: HOME_ITEMS,
    lastUpdated: '2026-02-28'
  })),
  getResearchContent: vi.fn(async () => ({
    page: 'research',
    title: 'Research',
    sections: HOME_ITEMS,
    lastUpdated: '2026-02-28'
  })),
  getInsightsContent: vi.fn(async () => ({
    page: 1,
    perPage: 10,
    total: HOME_ITEMS.length,
    totalPages: 1,
    title: 'Insights',
    sections: HOME_ITEMS,
    lastUpdated: '2026-02-28',
    pagination: {
      total: HOME_ITEMS.length,
      page: 1,
      perPage: 10,
      totalPages: 1
    }
  }))
}));

async function renderHomePage() {
  render(await HomePage());
}

describe('HomePage public composition contract', () => {
  it('renders desktop homepage wrapper with expected section stack', async () => {
    await renderHomePage();

    const desktopContent = screen.getByTestId('home-desktop-content');
    expect(desktopContent).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { level: 1, name: 'Thomas Hadden' })).toBeInTheDocument();
    expect(within(desktopContent).getByTestId('home-llm-shell')).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { name: 'Featured Work' })).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { name: 'About Thomas' })).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { name: 'Research' })).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { name: 'Latest Insights' })).toBeInTheDocument();
    expect(
      within(desktopContent).getByRole('heading', { name: 'How AI-ready is your business?' })
    ).toBeInTheDocument();
  });

  it('renders mobile homepage wrapper with collapsed rows and terminal collaborate CTA', async () => {
    await renderHomePage();

    const mobileContent = screen.getByTestId('home-mobile-content');
    expect(mobileContent).toBeInTheDocument();
    expect(within(mobileContent).getByRole('heading', { level: 1, name: 'Thomas Hadden' })).toBeInTheDocument();
    expect(within(mobileContent).getByTestId('home-llm-shell')).toBeInTheDocument();
    expect(within(mobileContent).getByTestId('readiness-card')).toBeInTheDocument();
    expect(within(mobileContent).getByRole('link', { name: /featured work/i })).toBeInTheDocument();
    expect(within(mobileContent).getByRole('link', { name: /about thomas/i })).toBeInTheDocument();
    expect(within(mobileContent).getByRole('link', { name: /current research/i })).toBeInTheDocument();
    expect(within(mobileContent).getByRole('link', { name: /latest insights/i })).toBeInTheDocument();
    expect(within(mobileContent).getByTestId('collaborate-row')).toBeInTheDocument();
  });

  it('keeps a visible homepage LLM shell placeholder on the route', async () => {
    await renderHomePage();

    expect(screen.getByTestId('home-llm-shell')).toBeVisible();
  });

  it('does not render legacy RoutePlaceholder copy on home', async () => {
    await renderHomePage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
