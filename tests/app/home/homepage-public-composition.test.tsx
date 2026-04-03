import { render, screen, within } from '@testing-library/react';
import HomePage from '@/app/page';
import type { PublicContentItem } from '@/lib/content/types';

const HOME_ITEMS: PublicContentItem[] = [
  {
    id: 'home-1',
    title: 'About Thomas',
    slug: 'home-about-teaser',
    summary:
      'Thomas Hadden is an engineer and applied AI researcher based in Northern Ireland. He works at Park Electrical Belfast as a Siemens automation specialist, delivering control system upgrades and technical solutions for water treatment and process industries. Alongside his commercial role, he is undertaking a part-time PhD at Ulster University, investigating how AI and digital twin technologies can be applied to real-world industrial control. Industrial Analytics & Automation is his independent platform for technical projects and research.',
    updatedAt: '2026-03-20'
  },
  {
    id: 'home-2',
    title: 'How AI-ready is your business?',
    slug: 'home-readiness',
    summary: 'A practical two-minute diagnostic to identify realistic AI next steps.',
    updatedAt: '2026-03-20'
  }
];

const FEATURED_PROJECTS: PublicContentItem[] = [
  {
    id: 'servo-drive-upgrade-wastewater',
    title: 'Servo Drive Upgrade for Wastewater Treatment',
    slug: 'servo-drive-upgrade-wastewater',
    summary: 'A full servo control system upgrade on an automated sludge press used in wastewater treatment.',
    updatedAt: '2026-03-17',
    category: 'Industrial Automation',
    status: 'completed',
    featured: true
  },
  {
    id: 'alpr-vehicle-tracking',
    title: 'Automatic Licence Plate Recognition System',
    slug: 'alpr-vehicle-tracking',
    summary: 'A bespoke Automatic Licence Plate Recognition system designed and built for a waste management and land regeneration business.',
    updatedAt: '2026-03-16',
    category: 'Applied AI',
    status: 'completed',
    featured: true
  }
];

const RESEARCH_ITEMS: PublicContentItem[] = [
  {
    id: 'bearing-fault-detection-wavelet',
    title: 'Bearing Fault Detection Using Wavelet Methods and Machine Learning',
    slug: 'bearing-fault-detection-wavelet',
    summary: 'Research into detecting roller element bearing faults using wavelet decomposition.',
    updatedAt: '2026-03-14',
    theme: 'Applied AI',
    featured: true
  },
  {
    id: 'phd-ai-process-control',
    title: 'AI-Driven Innovation in Industrial and Process Control Systems',
    slug: 'phd-ai-process-control',
    summary: 'A part-time PhD at Ulster University investigating how reinforcement learning and digital twin methodologies can be applied to real-world industrial process control.',
    updatedAt: '2026-03-13',
    theme: 'Industrial AI',
    featured: true
  }
];

const INSIGHT_ITEMS: PublicContentItem[] = [
  {
    id: 'insight-1',
    title: 'Insight One',
    slug: 'insight-one',
    summary: 'Fixture content for home composition tests.',
    updatedAt: '2026-03-12'
  },
  {
    id: 'insight-2',
    title: 'Insight Two',
    slug: 'insight-two',
    summary: 'Fixture content for home composition tests.',
    updatedAt: '2026-03-11'
  },
  {
    id: 'insight-3',
    title: 'Insight Three',
    slug: 'insight-three',
    summary: 'Fixture content for home composition tests.',
    updatedAt: '2026-03-10'
  }
];

vi.mock('@/lib/content/api', () => ({
  getHomeContent: vi.fn(async () => ({
    page: 'home',
    title: 'Home',
    sections: HOME_ITEMS,
    lastUpdated: '2026-02-28'
  })),
  getProjectsContent: vi.fn(async () => ({
    page: 'projects',
    title: 'Projects',
    sections: FEATURED_PROJECTS,
    lastUpdated: '2026-02-28'
  })),
  getResearchContent: vi.fn(async () => ({
    page: 'research',
    title: 'Research',
    sections: RESEARCH_ITEMS,
    lastUpdated: '2026-02-28'
  })),
  getInsightsContent: vi.fn(async () => ({
    page: 1,
    perPage: 10,
    total: INSIGHT_ITEMS.length,
    totalPages: 1,
    title: 'Insights',
    sections: INSIGHT_ITEMS,
    lastUpdated: '2026-02-28',
    pagination: {
      total: INSIGHT_ITEMS.length,
      page: 1,
      perPage: 10,
      totalPages: 1
    }
  }))
}));

async function renderHomePage() {
  render(await HomePage());
}

describe('HomePage public composition contract', () => {
  it('renders desktop homepage wrapper with expected section stack', async () => {
    await renderHomePage();

    const desktopContent = screen.getByTestId('home-desktop-content');
    expect(desktopContent).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { level: 1, name: 'Thomas Hadden' })).toBeInTheDocument();
    expect(within(desktopContent).getByTestId('home-llm-shell')).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { name: 'Featured Work' })).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { name: 'About Thomas' })).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { name: 'Research' })).toBeInTheDocument();
    expect(within(desktopContent).getByRole('heading', { name: 'Latest Insights' })).toBeInTheDocument();
    expect(
      within(desktopContent).getByRole('heading', { name: 'How AI-ready is your business?' })
    ).toBeInTheDocument();
    expect(
      within(desktopContent).getByText(/engineer and applied AI researcher based in Northern Ireland/i)
    ).toBeInTheDocument();
    expect(within(desktopContent).getByText('Servo Drive Upgrade for Wastewater Treatment')).toBeInTheDocument();
    expect(
      within(desktopContent).getByText('Bearing Fault Detection Using Wavelet Methods and Machine Learning')
    ).toBeInTheDocument();
  });

  it('renders mobile homepage wrapper with collapsed rows and terminal collaborate CTA', async () => {
    await renderHomePage();

    const mobileContent = screen.getByTestId('home-mobile-content');
    expect(mobileContent).toBeInTheDocument();
    expect(within(mobileContent).getByRole('heading', { level: 1, name: 'Thomas Hadden' })).toBeInTheDocument();
    expect(within(mobileContent).getByTestId('home-llm-shell')).toBeInTheDocument();
    expect(within(mobileContent).getByTestId('readiness-card')).toBeInTheDocument();
    expect(within(mobileContent).getByRole('link', { name: /featured work/i })).toBeInTheDocument();
    expect(within(mobileContent).getByRole('link', { name: /about thomas/i })).toBeInTheDocument();
    expect(within(mobileContent).getByRole('link', { name: /current research/i })).toBeInTheDocument();
    expect(within(mobileContent).getByRole('link', { name: /latest insights/i })).toBeInTheDocument();
    expect(within(mobileContent).getByTestId('collaborate-row')).toBeInTheDocument();
  });

  it('keeps a visible homepage LLM shell placeholder on the route', async () => {
    await renderHomePage();

    expect(screen.getByTestId('home-llm-shell')).toBeVisible();
  });

  it('does not render legacy RoutePlaceholder copy on home', async () => {
    await renderHomePage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
