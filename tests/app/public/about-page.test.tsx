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
      'Thomas Hadden builds applied AI systems for industrial environments.\n\nAt Park Electrical Belfast, he focuses on automation delivery tied to engineering outcomes.\n\nIndustrial Analytics & Automation (IA&A) is his platform for practical research and collaboration.',
    updatedAt: '2026-03-15T10:30:00Z',
    tags: ['Industrial AI', 'Automation'],
    location: 'Park Electrical Belfast'
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
    expect(within(main).getByText(/Thomas Hadden builds applied AI systems/i)).toBeInTheDocument();
    expect(within(main).getByText(/Park Electrical Belfast/i)).toBeInTheDocument();
    expect(within(main).getByText(/Industrial Analytics & Automation/i)).toBeInTheDocument();
  });

  it('does not keep RoutePlaceholder copy once the page is implemented', async () => {
    await renderAboutPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
