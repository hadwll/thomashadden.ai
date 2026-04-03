import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import AboutPage from '@/app/about/page';
import ContactPage from '@/app/contact/page';
import CookiesPage from '@/app/cookies/page';
import HomePage from '@/app/page';
import InsightsPage from '@/app/insights/page';
import PrivacyPage from '@/app/privacy/page';
import ProjectsPage from '@/app/projects/page';
import ReadinessPage from '@/app/readiness/page';
import ReadinessResultPage from '@/app/readiness/result/page';
import ResearchPage from '@/app/research/page';
import type { ContentPageResponse, PaginatedContentResponse } from '@/lib/content/types';

vi.mock('@/lib/content/api', () => ({
  getHomeContent: vi.fn(async (): Promise<ContentPageResponse> => ({
    page: 'home',
    title: 'Home',
    sections: [],
    lastUpdated: '2026-04-03T00:00:00.000Z'
  })),
  getAboutContent: vi.fn(async (): Promise<ContentPageResponse> => ({
    page: 'about',
    title: 'About',
    sections: [],
    lastUpdated: '2026-04-03T00:00:00.000Z'
  })),
  getProjectsContent: vi.fn(async (): Promise<ContentPageResponse> => ({
    page: 'projects',
    title: 'Projects',
    sections: [],
    lastUpdated: '2026-04-03T00:00:00.000Z'
  })),
  getResearchContent: vi.fn(async (): Promise<ContentPageResponse> => ({
    page: 'research',
    title: 'Research',
    sections: [],
    lastUpdated: '2026-04-03T00:00:00.000Z'
  })),
  getInsightsContent: vi.fn(async (): Promise<PaginatedContentResponse> => ({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
    title: 'Insights',
    sections: [],
    lastUpdated: '2026-04-03T00:00:00.000Z',
    pagination: {
      total: 0,
      page: 1,
      perPage: 10,
      totalPages: 1
    }
  }))
}));

type RouteCase = {
  route: string;
  heading: string;
  Component: () => JSX.Element | Promise<JSX.Element>;
  hideNav?: boolean;
};

const ROUTE_CASES: RouteCase[] = [
  { route: '/privacy', heading: 'Privacy Policy', Component: PrivacyPage },
  { route: '/cookies', heading: 'Cookie Policy', Component: CookiesPage }
];

const PLACEHOLDER_ROUTE_CASES = ROUTE_CASES.filter(({ route }) => route === '/privacy' || route === '/cookies');

async function renderRoute(Component: RouteCase['Component']) {
  render(await Component());
}

describe('placeholder routes', () => {
  it.each(ROUTE_CASES)('renders $route inside PageShell without crashing', async ({ Component }) => {
    await renderRoute(Component);
  });

  it.each(PLACEHOLDER_ROUTE_CASES)(
    'renders $route with stable placeholder heading and marker',
    async ({ Component, heading }) => {
      await renderRoute(Component);

      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByText('Placeholder route for SPR-01 bootstrap.')).toBeInTheDocument();
    }
  );

  it.each(ROUTE_CASES)('uses shell chrome according to hideNav for $route', async ({ Component, hideNav }) => {
    await renderRoute(Component);
    expect(screen.getAllByRole('banner').length).toBeGreaterThan(0);

    if (hideNav) {
      expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
      return;
    }

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });
});
