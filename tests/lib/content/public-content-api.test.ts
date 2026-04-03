import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAboutContent,
  getContactContent,
  getHomeContent,
  getInsightsContent,
  getProjectsContent,
  getResearchContent
} from '@/lib/content/api';

const originalFetch = global.fetch;

function expectRequestedPath(path: string) {
  const call = vi.mocked(global.fetch).mock.calls[0];
  expect(call).toBeTruthy();
  expect(String(call?.[0])).toBe(path);
}

describe('public content API helpers', () => {
  beforeEach(() => {
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('calls /api/content/home for getHomeContent', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { page: 'home', title: 'Home', sections: [], lastUpdated: '2026-03-15T10:30:00Z' }
        }),
        { status: 200 }
      )
    );

    await expect(getHomeContent()).resolves.toMatchObject({ page: 'home' });
    expectRequestedPath('/api/content/home');
  });

  it('calls /api/content/about for getAboutContent', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { page: 'about', title: 'About', sections: [], lastUpdated: '2026-03-15T10:30:00Z' }
        }),
        { status: 200 }
      )
    );

    await expect(getAboutContent()).resolves.toMatchObject({ page: 'about' });
    expectRequestedPath('/api/content/about');
  });

  it('calls /api/content/contact for getContactContent', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { page: 'contact', title: 'Contact', sections: [], lastUpdated: '2026-03-15T10:30:00Z' }
        }),
        { status: 200 }
      )
    );

    await expect(getContactContent()).resolves.toMatchObject({ page: 'contact' });
    expectRequestedPath('/api/content/contact');
  });

  it('calls /api/content/projects for projects list', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { page: 'projects', title: 'Projects', sections: [], lastUpdated: '2026-03-15T10:30:00Z' }
        }),
        { status: 200 }
      )
    );

    await expect(getProjectsContent()).resolves.toMatchObject({ page: 'projects' });
    expectRequestedPath('/api/content/projects');
  });

  it('calls /api/content/projects?featured=true for featured projects', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { page: 'projects', title: 'Projects', sections: [], lastUpdated: '2026-03-15T10:30:00Z' }
        }),
        { status: 200 }
      )
    );

    await expect(getProjectsContent({ featured: true })).resolves.toMatchObject({ page: 'projects' });
    expectRequestedPath('/api/content/projects?featured=true');
  });

  it('calls /api/content/projects?slug=... for project detail', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            page: 'projects',
            title: 'Projects',
            sections: [
              {
                id: 'servo-drive-upgrade-wastewater',
                title: 'Servo Drive Upgrade for Wastewater Treatment',
                slug: 'servo-drive-upgrade-wastewater',
                summary: 'Summary',
                updatedAt: '2026-03-15T10:30:00Z'
              }
            ],
            lastUpdated: '2026-03-15T10:30:00Z'
          }
        }),
        { status: 200 }
      )
    );

    await expect(getProjectsContent({ slug: 'servo-drive-upgrade-wastewater' })).resolves.toMatchObject({
      page: 'projects'
    });
    expectRequestedPath('/api/content/projects?slug=servo-drive-upgrade-wastewater');
  });

  it('calls /api/content/research?slug=... for research detail', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            page: 'research',
            title: 'Research',
            sections: [
              {
                id: 'bearing-fault-detection-wavelet',
                title: 'Bearing Fault Detection Using Wavelet Methods and Machine Learning',
                slug: 'bearing-fault-detection-wavelet',
                summary: 'Summary',
                updatedAt: '2026-03-15T10:30:00Z'
              }
            ],
            lastUpdated: '2026-03-15T10:30:00Z'
          }
        }),
        { status: 200 }
      )
    );

    await expect(getResearchContent({ slug: 'bearing-fault-detection-wavelet' })).resolves.toMatchObject({
      page: 'research'
    });
    expectRequestedPath('/api/content/research?slug=bearing-fault-detection-wavelet');
  });

  it('calls /api/content/insights?page=1&perPage=10 for paginated insights', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            page: 1,
            perPage: 10,
            total: 0,
            totalPages: 0,
            sections: []
          }
        }),
        { status: 200 }
      )
    );

    await expect(getInsightsContent({ page: 1, perPage: 10 })).resolves.toMatchObject({
      page: 1,
      perPage: 10
    });
    expectRequestedPath('/api/content/insights?page=1&perPage=10');
  });

  it('uses SSR-safe relative same-app fetch and parses JSON payload', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { page: 'home', title: 'Home', sections: [], lastUpdated: '2026-03-15T10:30:00Z' }
        }),
        { status: 200 }
      )
    );

    await getHomeContent();

    const [url] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    expect(typeof url).toBe('string');
    expect(String(url).startsWith('/api/content/')).toBe(true);
  });

  it('returns parsed data for success responses', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            page: 'about',
            title: 'About',
            sections: [{ id: 'about-1', title: 'About', slug: 'about-1', summary: 'Summary', updatedAt: '2026-03-15T10:30:00Z' }],
            lastUpdated: '2026-03-15T10:30:00Z'
          }
        }),
        { status: 200 }
      )
    );

    await expect(getAboutContent()).resolves.toMatchObject({
      page: 'about',
      sections: expect.any(Array)
    });
  });

  it('throws when success is false', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No content found' }
        }),
        { status: 404 }
      )
    );

    await expect(getProjectsContent()).rejects.toThrow(/not found|no content/i);
  });

  it('throws on non-OK HTTP status', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 500
      })
    );

    await expect(getHomeContent()).rejects.toThrow(/500|internal|failed/i);
  });

  it('throws on malformed payload shape', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200
      })
    );

    await expect(getResearchContent()).rejects.toThrow(/malformed|invalid|payload/i);
  });

  it('throws a not-found-style error for slug lookup misses', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            page: 'insights',
            title: 'Insights',
            sections: [],
            lastUpdated: '2026-03-15T10:30:00Z'
          }
        }),
        { status: 200 }
      )
    );

    await expect(getInsightsContent({ slug: 'missing-insight' })).rejects.toThrow(/not found/i);
  });
});
