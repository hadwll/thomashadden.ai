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

const PLACEHOLDER_ROUTE_CASES = ROUTE_CASES.filter(({ route }) => route !== '/readiness');

describe('placeholder routes', () => {
  it.each(ROUTE_CASES)('renders $route inside PageShell without crashing', ({ Component, hideNav }) => {
    expect(() => {
      render(<Component />);
    }).not.toThrow();
  });

  it.each(PLACEHOLDER_ROUTE_CASES)(
    'renders $route with stable placeholder heading and marker',
    ({ Component, heading }) => {
      render(<Component />);

      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByText('Placeholder route for SPR-01 bootstrap.')).toBeInTheDocument();
    }
  );

  it.each(ROUTE_CASES)('uses shell chrome according to hideNav for $route', ({ Component, hideNav }) => {
    render(<Component />);
    expect(screen.getByRole('banner')).toBeInTheDocument();

    if (hideNav) {
      expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
      return;
    }

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });
});
