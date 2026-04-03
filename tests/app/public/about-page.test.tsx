import { render, screen, within } from '@testing-library/react';
import AboutPage from '@/app/about/page';
import * as contentApi from '@/lib/content/api';

vi.mock('@/lib/content/api', () => ({
  getAboutContent: vi.fn()
}));

const ABOUT_SECTIONS = [
  {
    id: 'about-intro',
    title: 'About Thomas',
    slug: 'about-thomas',
    summary:
      'Thomas Hadden is an engineer and applied AI researcher based in Northern Ireland. He works at the intersection of industrial automation, process control, and artificial intelligence, with a focus on making these technologies practical, safe, and useful in real operational environments.\n\nThomas currently holds two roles. As an Application Engineer at Park Electrical Belfast, he works within the Automation Department as a Siemens specialist, delivering advanced control system design, servo drive upgrades, and automation solutions for clients across water treatment, wastewater, and process industries. He works closely with integrators, end users, and Siemens technical teams to specify, validate, and commission systems that meet demanding requirements for reliability and long-term supportability.\n\nAlongside his role at Park, Thomas is undertaking a part-time PhD at Ulster University. The research programme - AI-Driven Innovation in Industrial and Process Control Systems (AIPCon) - investigates how reinforcement learning and digital twin methodologies can be applied to real-world process control, with a particular emphasis on the gap between academic theory and industrial adoption.',
    updatedAt: '2026-03-15T10:30:00Z',
    tags: ['Park Electrical Belfast', 'Ulster University'],
    location: 'Northern Ireland'
  }
];

async function renderAboutPage() {
  render(await AboutPage());
}

describe('/about page contract', () => {
  beforeEach(() => {
    vi.mocked(contentApi.getAboutContent).mockResolvedValue({
      page: 'about',
      title: 'About',
      sections: ABOUT_SECTIONS,
      lastUpdated: '2026-03-15T10:30:00Z'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders inside PageShell and requests about content through SSR helper', async () => {
    await renderAboutPage();

    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
    expect(contentApi.getAboutContent).toHaveBeenCalledTimes(1);
  });

  it('renders H1 About with multi-paragraph professional context content', async () => {
    await renderAboutPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
    expect(within(main).getByText(/engineer and applied AI researcher based in Northern Ireland/i)).toBeInTheDocument();
    expect(within(main).getByText(/servo drive upgrades/i)).toBeInTheDocument();
    expect(within(main).getByText(/AIPCon/i)).toBeInTheDocument();
  });

  it('does not keep RoutePlaceholder copy once the page is implemented', async () => {
    await renderAboutPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
