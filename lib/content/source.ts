import type { ContentPageResponse, PublicContentItem } from '@/lib/content/types';

const HOME_SECTIONS: PublicContentItem[] = [
  {
    id: 'home-hero',
    title: 'Thomas Hadden',
    slug: 'home-hero',
    summary: 'Industrial AI, automation, and research practice based in Belfast.',
    updatedAt: '2026-03-20T09:00:00Z',
    tags: ['Industrial AI', 'Automation', 'Belfast']
  },
  {
    id: 'home-readiness',
    title: 'How AI-ready is your business?',
    slug: 'home-readiness',
    summary: 'A practical two-minute diagnostic to identify realistic AI next steps.',
    updatedAt: '2026-03-20T09:00:00Z',
    category: 'readiness'
  }
];

const ABOUT_SECTIONS: PublicContentItem[] = [
  {
    id: 'about-overview',
    title: 'About Thomas',
    slug: 'about-overview',
    summary:
      'Engineer and applied AI practitioner working with Park Electrical Belfast and Industrial Analytics & Automation.',
    updatedAt: '2026-03-18T10:00:00Z',
    location: 'Belfast',
    tags: ['Park Electrical Belfast', 'Industrial Analytics & Automation']
  }
];

const PROJECT_ITEMS: PublicContentItem[] = [
  {
    id: 'example-project',
    title: 'Example Project',
    slug: 'example-project',
    summary: 'Reference implementation used for public content API contract coverage.',
    updatedAt: '2026-03-15T10:30:00Z',
    category: 'platform',
    status: 'active',
    featured: true,
    tags: ['API', 'Next.js']
  },
  {
    id: 'connected-ai',
    title: 'Connected AI',
    slug: 'connected-ai',
    summary: 'AI-assisted engineering connectivity for distributed operational teams.',
    updatedAt: '2026-03-12T08:45:00Z',
    category: 'industrial-ai',
    status: 'active',
    featured: true,
    tags: ['AI', 'Engineering']
  },
  {
    id: 'maintenance-vision',
    title: 'Maintenance Vision',
    slug: 'maintenance-vision',
    summary: 'Computer-vision workflow for identifying recurring maintenance patterns.',
    updatedAt: '2026-03-09T12:00:00Z',
    category: 'computer-vision',
    status: 'pilot',
    featured: false,
    tags: ['Computer Vision', 'Operations']
  },
  {
    id: 'control-room-telemetry',
    title: 'Control Room Telemetry',
    slug: 'control-room-telemetry',
    summary: 'Telemetry and incident trend analysis for engineering operations centres.',
    updatedAt: '2026-03-05T16:20:00Z',
    category: 'analytics',
    status: 'active',
    featured: false,
    tags: ['Analytics', 'Telemetry']
  }
];

const RESEARCH_ITEMS: PublicContentItem[] = [
  {
    id: 'example-research',
    title: 'Example Research',
    slug: 'example-research',
    summary: 'Reference research item used for slug and list route coverage.',
    updatedAt: '2026-03-14T14:00:00Z',
    theme: 'applied-ai',
    status: 'active',
    tags: ['R&D']
  },
  {
    id: 'workplace-query-intelligence',
    title: 'Workplace Query Intelligence',
    slug: 'workplace-query-intelligence',
    summary: 'Evaluation of RAG-assisted decision support in industrial team workflows.',
    updatedAt: '2026-03-10T10:15:00Z',
    theme: 'rag',
    status: 'active',
    tags: ['RAG', 'Industrial']
  },
  {
    id: 'safety-signal-prioritisation',
    title: 'Safety Signal Prioritisation',
    slug: 'safety-signal-prioritisation',
    summary: 'Researching low-noise alerting strategies for frontline engineering contexts.',
    updatedAt: '2026-03-07T09:00:00Z',
    theme: 'safety',
    status: 'in_review',
    tags: ['Safety', 'Analytics']
  }
];

const INSIGHT_ITEMS: PublicContentItem[] = [
  {
    id: 'example-insight',
    title: 'Example Insight',
    slug: 'example-insight',
    summary: 'Reference insight item used for slug and pagination contract coverage.',
    updatedAt: '2026-03-19T09:30:00Z',
    publishedAt: '2026-03-19T09:30:00Z',
    tags: ['Insights', 'AI']
  },
  {
    id: 'ai-adoption-shifts-2026',
    title: 'Where AI Adoption Is Actually Moving in 2026',
    slug: 'ai-adoption-shifts-2026',
    summary: 'A practical read on adoption patterns seen across engineering and operations teams.',
    updatedAt: '2026-03-16T08:00:00Z',
    publishedAt: '2026-03-16T08:00:00Z',
    tags: ['Adoption', 'Strategy']
  },
  {
    id: 'signal-over-noise-rag',
    title: 'Signal Over Noise in RAG Deployments',
    slug: 'signal-over-noise-rag',
    summary: 'Lessons from reducing hallucination risk with tighter retrieval policies.',
    updatedAt: '2026-03-13T11:10:00Z',
    publishedAt: '2026-03-13T11:10:00Z',
    tags: ['RAG', 'Reliability']
  },
  {
    id: 'small-teams-automation-playbook',
    title: 'Automation Playbook for Small Technical Teams',
    slug: 'small-teams-automation-playbook',
    summary: 'How smaller teams can sequence AI and automation decisions without overreach.',
    updatedAt: '2026-03-08T07:40:00Z',
    publishedAt: '2026-03-08T07:40:00Z',
    tags: ['Automation', 'SME']
  }
];

export const HOME_CONTENT: ContentPageResponse = {
  page: 'home',
  title: 'Home',
  sections: HOME_SECTIONS,
  lastUpdated: '2026-03-20T09:00:00Z'
};

export const ABOUT_CONTENT: ContentPageResponse = {
  page: 'about',
  title: 'About',
  sections: ABOUT_SECTIONS,
  lastUpdated: '2026-03-18T10:00:00Z'
};

export const PROJECTS_CONTENT: ContentPageResponse = {
  page: 'projects',
  title: 'Projects',
  sections: PROJECT_ITEMS,
  lastUpdated: '2026-03-15T10:30:00Z'
};

export const RESEARCH_CONTENT: ContentPageResponse = {
  page: 'research',
  title: 'Research',
  sections: RESEARCH_ITEMS,
  lastUpdated: '2026-03-14T14:00:00Z'
};

export const INSIGHTS_CONTENT: ContentPageResponse = {
  page: 'insights',
  title: 'Insights',
  sections: INSIGHT_ITEMS,
  lastUpdated: '2026-03-19T09:30:00Z'
};
