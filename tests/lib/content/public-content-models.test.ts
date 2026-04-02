import { describe, expect, it } from 'vitest';
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

const BASE_ITEM: PublicContentItem = {
  id: 'connected-ai',
  title: 'Connected AI',
  slug: 'connected-ai',
  summary: 'AI-driven connectivity for engineering environments.',
  updatedAt: '2026-03-01T00:00:00Z',
  tags: ['AI', 'Engineering'],
  status: 'active',
  category: 'industrial-ai',
  theme: 'automation',
  location: 'Belfast',
  publishedAt: '2026-03-02T00:00:00Z',
  featured: true,
  imageUrl: '/images/projects/connected-ai.jpg'
};

describe('public content model contracts', () => {
  it('supports a shared content item shape for public cards and rows', () => {
    expect(BASE_ITEM.id).toBe('connected-ai');
    expect(BASE_ITEM.title).toBeTruthy();
    expect(BASE_ITEM.slug).toBeTruthy();
    expect(BASE_ITEM.summary).toBeTruthy();
    expect(BASE_ITEM.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(BASE_ITEM.tags).toEqual(expect.arrayContaining(['AI']));
    expect(BASE_ITEM.featured).toBe(true);
  });

  it('models the page response envelope as page/title/sections/lastUpdated', () => {
    const response: ContentPageResponse = {
      page: 'projects',
      title: 'Projects',
      sections: [BASE_ITEM],
      lastUpdated: '2026-03-15T10:30:00Z'
    };

    expect(response.page).toBe('projects');
    expect(response.title).toBe('Projects');
    expect(response.sections).toHaveLength(1);
    expect(response.lastUpdated).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('models insights list responses with pagination metadata and shared entries', () => {
    const response: PaginatedContentResponse = {
      page: 1,
      perPage: 10,
      total: 42,
      totalPages: 5,
      sections: [BASE_ITEM]
    };

    expect(response.page).toBe(1);
    expect(response.perPage).toBe(10);
    expect(response.total).toBe(42);
    expect(response.totalPages).toBe(5);
    expect(response.sections[0]).toMatchObject({
      id: BASE_ITEM.id,
      slug: BASE_ITEM.slug
    });
  });

  it('represents detail lookups as a single matching sections item and supports not-found shape', () => {
    const found: ContentPageResponse = {
      page: 'projects',
      title: 'Projects',
      sections: [BASE_ITEM],
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
    expect(Object.keys(BASE_ITEM)).not.toEqual(expect.arrayContaining(['score', 'resultScore']));
    expect(Object.keys(BASE_ITEM)).not.toEqual(
      expect.arrayContaining(['readinessSessionId', 'sessionToken', 'userId'])
    );
    expect(Object.keys(BASE_ITEM)).not.toEqual(expect.arrayContaining(['email', 'honeypot']));
  });
});
