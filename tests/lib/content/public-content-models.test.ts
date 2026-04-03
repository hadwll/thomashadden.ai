import { describe, expect, it } from 'vitest';
import { PUBLIC_CONTENT_PAGE_KEYS } from '@/lib/content/types';
import type {
  ContentPageResponse,
  PaginatedContentResponse,
  PublicContentItem
} from '@/lib/content/types';

type ForbiddenPublicFields =
  | 'score'
  | 'resultScore'
  | 'readinessSessionId'
  | 'sessionToken'
  | 'userId'
  | 'email'
  | 'honeypot';

type Assert<T extends true> = T;
type PublicItemHasNoForbiddenFields =
  Extract<keyof PublicContentItem, ForbiddenPublicFields> extends never ? true : false;

const assertPublicItemFieldBoundary: Assert<PublicItemHasNoForbiddenFields> = true;
void assertPublicItemFieldBoundary;

const APPROVED_PROJECT_ITEM: PublicContentItem = {
  id: 'servo-drive-upgrade-wastewater',
  title: 'Servo Drive Upgrade for Wastewater Treatment',
  slug: 'servo-drive-upgrade-wastewater',
  summary: 'A full servo control system upgrade on an automated sludge press used in wastewater treatment.',
  updatedAt: '2026-03-17T10:30:00Z',
  tags: ['Siemens S120', 'Water Treatment'],
  status: 'completed',
  category: 'Industrial Automation',
  location: 'Northern Ireland',
  featured: true
};

const APPROVED_RESEARCH_ITEM: PublicContentItem = {
  id: 'bearing-fault-detection-wavelet',
  title: 'Bearing Fault Detection Using Wavelet Methods and Machine Learning',
  slug: 'bearing-fault-detection-wavelet',
  summary: 'Research into detecting roller element bearing faults using wavelet decomposition.',
  updatedAt: '2026-03-14T10:30:00Z',
  tags: ['Condition Monitoring', 'Machine Learning'],
  status: 'completed',
  theme: 'Applied AI',
  featured: true
};

const CONTACT_ITEM: PublicContentItem = {
  id: 'contact-intro',
  title: 'Contact Introduction',
  slug: 'contact-intro',
  summary: 'If you are thinking about where AI fits in your business, I would like to hear from you.',
  updatedAt: '2026-03-12T10:30:00Z'
};

describe('public content model contracts', () => {
  it('exposes contact in the canonical public page key set', () => {
    expect(PUBLIC_CONTENT_PAGE_KEYS).toEqual(['home', 'about', 'projects', 'research', 'insights', 'contact']);
  });

  it('supports a shared content item shape for public cards and rows', () => {
    expect(APPROVED_PROJECT_ITEM.id).toBe('servo-drive-upgrade-wastewater');
    expect(APPROVED_PROJECT_ITEM.title).toBeTruthy();
    expect(APPROVED_PROJECT_ITEM.slug).toBeTruthy();
    expect(APPROVED_PROJECT_ITEM.summary).toBeTruthy();
    expect(APPROVED_PROJECT_ITEM.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(APPROVED_PROJECT_ITEM.tags).toEqual(expect.arrayContaining(['Siemens S120']));
    expect(APPROVED_PROJECT_ITEM.featured).toBe(true);
    expect(APPROVED_RESEARCH_ITEM.slug).toBe('bearing-fault-detection-wavelet');
  });

  it('models the page response envelope as page/title/sections/lastUpdated', () => {
    const response: ContentPageResponse = {
      page: 'contact',
      title: 'Contact',
      sections: [CONTACT_ITEM],
      lastUpdated: '2026-03-15T10:30:00Z'
    };

    expect(response.page).toBe('contact');
    expect(response.title).toBe('Contact');
    expect(response.sections).toHaveLength(1);
    expect(response.lastUpdated).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('models insights list responses with pagination metadata and shared entries', () => {
    const response: PaginatedContentResponse = {
      page: 1,
      perPage: 10,
      total: 42,
      totalPages: 5,
      sections: [APPROVED_PROJECT_ITEM]
    };

    expect(response.page).toBe(1);
    expect(response.perPage).toBe(10);
    expect(response.total).toBe(42);
    expect(response.totalPages).toBe(5);
    expect(response.sections[0]).toMatchObject({
      id: APPROVED_PROJECT_ITEM.id,
      slug: APPROVED_PROJECT_ITEM.slug
    });
  });

  it('represents detail lookups as a single matching sections item and supports not-found shape', () => {
    const found: ContentPageResponse = {
      page: 'projects',
      title: 'Projects',
      sections: [APPROVED_PROJECT_ITEM],
      lastUpdated: '2026-03-15T10:30:00Z'
    };

    const notFound: ContentPageResponse = {
      page: 'projects',
      title: 'Projects',
      sections: [],
      lastUpdated: '2026-03-15T10:30:00Z'
    };

    expect(found.sections).toHaveLength(1);
    expect(notFound.sections).toHaveLength(0);
  });

  it('does not leak readiness, auth, or contact-only fields on public content items', () => {
    expect(Object.keys(APPROVED_PROJECT_ITEM)).not.toEqual(expect.arrayContaining(['score', 'resultScore']));
    expect(Object.keys(APPROVED_PROJECT_ITEM)).not.toEqual(
      expect.arrayContaining(['readinessSessionId', 'sessionToken', 'userId'])
    );
    expect(Object.keys(APPROVED_PROJECT_ITEM)).not.toEqual(expect.arrayContaining(['email', 'honeypot']));
  });
});
