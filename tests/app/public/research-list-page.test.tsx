import { render, screen, within } from '@testing-library/react';
import ResearchPage from '@/app/research/page';
import * as contentApi from '@/lib/content/api';

vi.mock('@/lib/content/api', () => ({
  getResearchContent: vi.fn()
}));

const RESEARCH_ITEMS = [
  {
    id: 'agentic-operations',
    title: 'Agentic Operations in Industrial Control',
    slug: 'agentic-operations-industrial-control',
    summary: 'Applied research into reliable multi-agent orchestration.',
    updatedAt: '2026-03-12T10:30:00Z',
    theme: 'Industrial Automation'
  },
  {
    id: 'edge-vision',
    title: 'Edge Vision Deployment Patterns',
    slug: 'edge-vision-deployment-patterns',
    summary: 'Field-tested deployment constraints for edge inference.',
    updatedAt: '2026-03-13T10:30:00Z',
    theme: 'Computer Vision'
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
    expect(within(main).getByText('Agentic Operations in Industrial Control')).toBeInTheDocument();
    expect(within(main).getByText('Edge Vision Deployment Patterns')).toBeInTheDocument();
  });

  it('renders each research item as a link to /research/[slug]', async () => {
    await renderResearchPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('link', { name: /Agentic Operations in Industrial Control/i })).toHaveAttribute(
      'href',
      '/research/agentic-operations-industrial-control'
    );
    expect(within(main).getByRole('link', { name: /Edge Vision Deployment Patterns/i })).toHaveAttribute(
      'href',
      '/research/edge-vision-deployment-patterns'
    );
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    await renderResearchPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
