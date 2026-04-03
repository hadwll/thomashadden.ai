import { render, screen, within } from '@testing-library/react';
import ResearchPage from '@/app/research/page';
import * as contentApi from '@/lib/content/api';

vi.mock('@/lib/content/api', () => ({
  getResearchContent: vi.fn()
}));

const RESEARCH_ITEMS = [
  {
    id: 'bearing-fault-detection-wavelet',
    title: 'Bearing Fault Detection Using Wavelet Methods and Machine Learning',
    slug: 'bearing-fault-detection-wavelet',
    summary: 'Research into detecting roller element bearing faults using wavelet decomposition.',
    updatedAt: '2026-03-14T10:30:00Z',
    theme: 'Applied AI',
    featured: true
  },
  {
    id: 'phd-ai-process-control',
    title: 'AI-Driven Innovation in Industrial and Process Control Systems',
    slug: 'phd-ai-process-control',
    summary:
      'A part-time PhD at Ulster University investigating how reinforcement learning and digital twin methodologies can be applied to real-world industrial process control.',
    updatedAt: '2026-03-13T10:30:00Z',
    theme: 'Industrial AI',
    featured: true
  }
];

async function renderResearchPage() {
  render(await ResearchPage());
}

describe('/research list page contract', () => {
  beforeEach(() => {
    vi.mocked(contentApi.getResearchContent).mockResolvedValue({
      page: 'research',
      title: 'Research',
      sections: RESEARCH_ITEMS,
      lastUpdated: '2026-03-15T10:30:00Z'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests research list data via SSR helper', async () => {
    await renderResearchPage();

    expect(contentApi.getResearchContent).toHaveBeenCalledTimes(1);
  });

  it('renders Research heading with one or more research entries', async () => {
    await renderResearchPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('heading', { level: 1, name: 'Research' })).toBeInTheDocument();
    expect(within(main).getByText('Bearing Fault Detection Using Wavelet Methods and Machine Learning')).toBeInTheDocument();
    expect(within(main).getByText('AI-Driven Innovation in Industrial and Process Control Systems')).toBeInTheDocument();
  });

  it('renders each research item as a link to /research/[slug]', async () => {
    await renderResearchPage();

    const main = screen.getByTestId('shell-main-content');
    expect(
      within(main).getByRole('link', { name: /Bearing Fault Detection Using Wavelet Methods and Machine Learning/i })
    ).toHaveAttribute(
      'href',
      '/research/bearing-fault-detection-wavelet'
    );
    expect(
      within(main).getByRole('link', { name: /AI-Driven Innovation in Industrial and Process Control Systems/i })
    ).toHaveAttribute(
      'href',
      '/research/phd-ai-process-control'
    );
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    await renderResearchPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
