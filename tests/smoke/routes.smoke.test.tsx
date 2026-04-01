import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/about/page';
import HomePage from '@/app/page';
import ReadinessResultPage from '@/app/readiness/result/page';

describe('route placeholders', () => {
  it.each([
    {
      name: 'home',
      Component: HomePage,
      heading: 'Home',
      route: 'Route: /'
    },
    {
      name: 'about',
      Component: AboutPage,
      heading: 'About',
      route: 'Route: /about'
    },
    {
      name: 'readiness result',
      Component: ReadinessResultPage,
      heading: 'Readiness Result',
      route: 'Route: /readiness/result'
    }
  ])('renders the $name placeholder route', ({ Component, heading, route }) => {
    render(<Component />);

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByText(route)).toBeInTheDocument();
    expect(screen.getByText('Placeholder route for SPR-01 bootstrap.')).toBeInTheDocument();
  });
});
