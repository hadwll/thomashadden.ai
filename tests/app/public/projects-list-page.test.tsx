import { render, screen, within } from '@testing-library/react';
import ProjectsPage from '@/app/projects/page';
import * as contentApi from '@/lib/content/api';

vi.mock('@/lib/content/api', () => ({
  getProjectsContent: vi.fn()
}));

const PROJECT_ITEMS = [
  {
    id: 'servo-drive-upgrade-wastewater',
    title: 'Servo Drive Upgrade for Wastewater Treatment',
    slug: 'servo-drive-upgrade-wastewater',
    summary: 'A full servo control system upgrade on an automated sludge press used in wastewater treatment.',
    updatedAt: '2026-03-17T10:30:00Z',
    category: 'Industrial Automation',
    status: 'completed',
    featured: true
  },
  {
    id: 'alpr-vehicle-tracking',
    title: 'Automatic Licence Plate Recognition System',
    slug: 'alpr-vehicle-tracking',
    summary: 'A bespoke Automatic Licence Plate Recognition system designed and built for a waste management and land regeneration business.',
    updatedAt: '2026-03-16T10:30:00Z',
    category: 'Applied AI',
    status: 'completed',
    featured: true
  },
  {
    id: 'date-code-vision-classifier',
    title: 'Date Code Vision System',
    slug: 'date-code-vision-classifier',
    summary: 'A deep learning vision system built to classify date codes on packaging in a live food manufacturing environment.',
    updatedAt: '2026-03-15T10:30:00Z',
    category: 'AI & Computer Vision',
    status: 'completed',
    featured: true
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
    expect(within(main).getByText('Servo Drive Upgrade for Wastewater Treatment')).toBeInTheDocument();
    expect(within(main).getByText('Automatic Licence Plate Recognition System')).toBeInTheDocument();
    expect(within(main).getByText('Date Code Vision System')).toBeInTheDocument();
  });

  it('renders each project as a link to /projects/[slug]', async () => {
    await renderProjectsPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByRole('link', { name: /Servo Drive Upgrade for Wastewater Treatment/i })).toHaveAttribute(
      'href',
      '/projects/servo-drive-upgrade-wastewater'
    );
    expect(within(main).getByRole('link', { name: /Automatic Licence Plate Recognition System/i })).toHaveAttribute(
      'href',
      '/projects/alpr-vehicle-tracking'
    );
    expect(within(main).getByRole('link', { name: /Date Code Vision System/i })).toHaveAttribute(
      'href',
      '/projects/date-code-vision-classifier'
    );
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    await renderProjectsPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
