import { render, screen, within } from '@testing-library/react';
import ProjectsPage from '@/app/projects/page';
import * as contentApi from '@/lib/content/api';

vi.mock('@/lib/content/api', () => ({
  getProjectsContent: vi.fn()
}));

const PROJECT_ITEMS = [
  {
    id: 'predictive-maintenance',
    title: 'Predictive Maintenance Platform',
    slug: 'predictive-maintenance-platform',
    summary: 'Predictive failure modeling for industrial assets.',
    updatedAt: '2026-03-10T10:30:00Z',
    category: 'Industrial AI',
    status: 'active'
  },
  {
    id: 'quality-vision',
    title: 'Computer Vision QA Pipeline',
    slug: 'computer-vision-qa-pipeline',
    summary: 'Automated visual inspection and exception routing.',
    updatedAt: '2026-03-11T10:30:00Z',
    category: 'Automation',
    status: 'active'
  }
];

async function renderProjectsPage() {
  render(await ProjectsPage());
}

describe('/projects list page contract', () => {
  beforeEach(() => {
    vi.mocked(contentApi.getProjectsContent).mockResolvedValue({
      page: 'projects',
      title: 'Projects',
      sections: PROJECT_ITEMS,
      lastUpdated: '2026-03-15T10:30:00Z'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests projects list data via SSR helper', async () => {
    await renderProjectsPage();

    expect(contentApi.getProjectsContent).toHaveBeenCalledTimes(1);
  });

  it('renders Projects heading with multiple project entries from fetched data', async () => {
    await renderProjectsPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(within(main).getByText('Predictive Maintenance Platform')).toBeInTheDocument();
    expect(within(main).getByText('Computer Vision QA Pipeline')).toBeInTheDocument();
  });

  it('renders each project as a link to /projects/[slug]', async () => {
    await renderProjectsPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('link', { name: /Predictive Maintenance Platform/i })).toHaveAttribute(
      'href',
      '/projects/predictive-maintenance-platform'
    );
    expect(within(main).getByRole('link', { name: /Computer Vision QA Pipeline/i })).toHaveAttribute(
      'href',
      '/projects/computer-vision-qa-pipeline'
    );
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    await renderProjectsPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
