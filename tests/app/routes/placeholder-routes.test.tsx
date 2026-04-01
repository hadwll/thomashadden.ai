import { render, screen } from '@testing-library/react';
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
import { PageShell } from '@/components/layout/PageShell';

type RouteCase = {
  route: string;
  heading: string;
  Component: () => JSX.Element;
  hideNav?: boolean;
};

const ROUTE_CASES: RouteCase[] = [
  { route: '/', heading: 'Home', Component: HomePage },
  { route: '/about', heading: 'About', Component: AboutPage },
  { route: '/projects', heading: 'Projects', Component: ProjectsPage },
  { route: '/research', heading: 'Research', Component: ResearchPage },
  { route: '/insights', heading: 'Insights', Component: InsightsPage },
  { route: '/contact', heading: 'Contact', Component: ContactPage },
  { route: '/readiness', heading: 'AI Readiness Check', Component: ReadinessPage, hideNav: true },
  {
    route: '/readiness/result',
    heading: 'Readiness Result',
    Component: ReadinessResultPage
  },
  { route: '/privacy', heading: 'Privacy Policy', Component: PrivacyPage },
  { route: '/cookies', heading: 'Cookie Policy', Component: CookiesPage }
];

function renderRouteInShell(Component: RouteCase['Component'], hideNav = false) {
  return render(
    <PageShell hideNav={hideNav}>
      <Component />
    </PageShell>
  );
}

describe('placeholder routes', () => {
  it.each(ROUTE_CASES)('renders $route inside PageShell without crashing', ({ Component, hideNav }) => {
    expect(() => {
      renderRouteInShell(Component, hideNav);
    }).not.toThrow();
  });

  it.each(ROUTE_CASES)(
    'renders $route with stable placeholder heading and marker',
    ({ Component, heading, hideNav }) => {
      renderRouteInShell(Component, hideNav);

      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByText('Placeholder route for SPR-01 bootstrap.')).toBeInTheDocument();
    }
  );

  it.each(ROUTE_CASES)('uses shell chrome according to hideNav for $route', ({ Component, hideNav }) => {
    renderRouteInShell(Component, hideNav);

    if (hideNav) {
      expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
      return;
    }

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });
});
