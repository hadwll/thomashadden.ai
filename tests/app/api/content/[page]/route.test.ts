import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/content/[page]/route';

type RouteContext = {
  params: {
    page: string;
  };
};

async function invoke(page: string, query = '') {
  const request = new NextRequest(`http://localhost:3000/api/content/${page}${query}`);
  const response = await GET(request, { params: { page } } as RouteContext);
  const body = await response.json();

  return { response, body };
}

function expectMeta(meta: unknown) {
  const maybeMeta = meta as { requestId?: unknown; timestamp?: unknown };
  expect(maybeMeta).toBeTruthy();
  expect(typeof maybeMeta.requestId).toBe('string');
  expect(typeof maybeMeta.timestamp).toBe('string');
}

describe('GET /api/content/[page] contract', () => {
  it.each(['home', 'about', 'projects', 'research', 'insights', 'contact'])(
    'supports valid public page segment: %s',
    async (page) => {
      const { response, body } = await invoke(page);
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expectMeta(body.meta);
    }
  );

  it('returns content-page response for home and about', async () => {
    const home = await invoke('home');
    const about = await invoke('about');
    const contact = await invoke('contact');

    expect(home.body.data).toMatchObject({ page: 'home' });
    expect(about.body.data).toMatchObject({ page: 'about' });
    expect(contact.body.data).toMatchObject({ page: 'contact' });
  });

  it('returns list content for projects and research', async () => {
    const projects = await invoke('projects');
    const research = await invoke('research');

    expect(projects.body.data).toMatchObject({ page: 'projects', sections: expect.any(Array) });
    expect(research.body.data).toMatchObject({ page: 'research', sections: expect.any(Array) });
  });

  it('returns paginated content shape for insights list query', async () => {
    const { body } = await invoke('insights', '?page=1&perPage=10');

    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      page: 1,
      perPage: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number)
    });
    expectMeta(body.meta);
  });

  it('supports featured projects selection and distinguishes from full list', async () => {
    const listResponse = await invoke('projects');
    const featuredResponse = await invoke('projects', '?featured=true');

    expect(listResponse.response.status).toBe(200);
    expect(featuredResponse.response.status).toBe(200);
    expect(featuredResponse.body.success).toBe(true);
    expect(featuredResponse.body.data).toBeDefined();
    expectMeta(featuredResponse.body.meta);

    const featuredSections = featuredResponse.body.data.sections as Array<{ featured?: boolean }>;
    expect(Array.isArray(featuredSections)).toBe(true);
    for (const item of featuredSections) {
      expect(item.featured).toBe(true);
    }
  });

  it.each([
    ['projects', 'servo-drive-upgrade-wastewater'],
    ['research', 'bearing-fault-detection-wavelet'],
    ['insights', 'example-insight']
  ])('supports slug detail lookup for %s', async (page, slug) => {
    const { response, body } = await invoke(page, `?slug=${slug}`);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.sections).toHaveLength(1);
    expect(body.data.sections[0]).toMatchObject({ slug });
    expectMeta(body.meta);
  });

  it.each([
    ['projects', 'missing-project'],
    ['research', 'missing-research'],
    ['insights', 'missing-insight']
  ])('returns not-found envelope when slug is missing for %s', async (page, slug) => {
    const { response, body } = await invoke(page, `?slug=${slug}`);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({ code: 'NOT_FOUND' });
    expectMeta(body.meta);
  });

  it('returns NOT_FOUND error envelope for invalid page segment', async () => {
    const { response, body } = await invoke('unknown');

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({ code: 'NOT_FOUND' });
    expectMeta(body.meta);
  });

  it.each([
    ['home', '?featured=true'],
    ['about', '?page=1&perPage=10'],
    ['projects', '?slug=servo-drive-upgrade-wastewater&featured=true'],
    ['contact', '?slug=contact-intro']
  ])('returns 422 VALIDATION_ERROR for invalid query combination: %s %s', async (page, query) => {
    const { response, body } = await invoke(page, query);

    expect(response.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expectMeta(body.meta);
  });

  it('returns internal-error envelope for downstream content-service failures', async () => {
    const { response, body } = await invoke('projects', '?slug=trigger-internal-error');

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({ code: 'INTERNAL_ERROR' });
    expectMeta(body.meta);
  });
});
