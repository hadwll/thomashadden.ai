import { NextRequest, NextResponse } from 'next/server';
import {
  buildContentPageResponse,
  buildPaginatedContentResponse,
  findBySlug,
  selectFeaturedItems
} from '@/lib/content/mappers';
import {
  ABOUT_CONTENT,
  CONTACT_CONTENT,
  HOME_CONTENT,
  INSIGHTS_CONTENT,
  PROJECTS_CONTENT,
  RESEARCH_CONTENT
} from '@/lib/content/source';
import { isPublicContentPageKey, type PublicContentPageKey } from '@/lib/content/types';

type ErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

type RouteContext = {
  params: {
    page: string;
  };
};

const VALID_QUERY_KEYS = new Set(['slug', 'featured', 'page', 'perPage']);

function createMeta() {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    requestId,
    timestamp: new Date().toISOString()
  };
}

function ok(data: unknown) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: createMeta()
    },
    { status: 200 }
  );
}

function error(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      },
      meta: createMeta()
    },
    { status }
  );
}

function parsePositiveInt(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function parseBoolean(value: string | null): boolean | null {
  if (value === null) {
    return null;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function buildPageResponse(page: PublicContentPageKey) {
  switch (page) {
    case 'home':
      return buildContentPageResponse(
        HOME_CONTENT.page,
        HOME_CONTENT.title,
        HOME_CONTENT.sections,
        HOME_CONTENT.lastUpdated
      );
    case 'about':
      return buildContentPageResponse(
        ABOUT_CONTENT.page,
        ABOUT_CONTENT.title,
        ABOUT_CONTENT.sections,
        ABOUT_CONTENT.lastUpdated
      );
    case 'projects':
      return buildContentPageResponse(
        PROJECTS_CONTENT.page,
        PROJECTS_CONTENT.title,
        PROJECTS_CONTENT.sections,
        PROJECTS_CONTENT.lastUpdated
      );
    case 'research':
      return buildContentPageResponse(
        RESEARCH_CONTENT.page,
        RESEARCH_CONTENT.title,
        RESEARCH_CONTENT.sections,
        RESEARCH_CONTENT.lastUpdated
      );
    case 'contact':
      return buildContentPageResponse(
        CONTACT_CONTENT.page,
        CONTACT_CONTENT.title,
        CONTACT_CONTENT.sections,
        CONTACT_CONTENT.lastUpdated
      );
    case 'insights':
      return buildContentPageResponse(
        INSIGHTS_CONTENT.page,
        INSIGHTS_CONTENT.title,
        INSIGHTS_CONTENT.sections,
        INSIGHTS_CONTENT.lastUpdated
      );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const page = context.params.page;
  if (!isPublicContentPageKey(page)) {
    return error(404, 'NOT_FOUND', 'Requested content page was not found.');
  }

  const searchParams = request.nextUrl.searchParams;
  for (const key of searchParams.keys()) {
    if (!VALID_QUERY_KEYS.has(key)) {
      return error(422, 'VALIDATION_ERROR', 'Invalid query parameter for content endpoint.', {
        parameter: key
      });
    }
  }

  const slugParam = searchParams.get('slug');
  const slug = slugParam?.trim() ?? '';

  if (slugParam !== null && slug.length === 0) {
    return error(422, 'VALIDATION_ERROR', 'Slug must be a non-empty string.');
  }

  const featuredParam = searchParams.get('featured');
  const hasFeatured = featuredParam !== null;
  const featured = parseBoolean(featuredParam);

  if (hasFeatured && featured === null) {
    return error(422, 'VALIDATION_ERROR', 'Featured must be a boolean query value.');
  }

  const pageParam = searchParams.get('page');
  const perPageParam = searchParams.get('perPage');
  const parsedPage = parsePositiveInt(pageParam);
  const parsedPerPage = parsePositiveInt(perPageParam);

  if (pageParam !== null && parsedPage === null) {
    return error(422, 'VALIDATION_ERROR', 'Page must be a positive integer.');
  }

  if (perPageParam !== null && parsedPerPage === null) {
    return error(422, 'VALIDATION_ERROR', 'perPage must be a positive integer.');
  }

  if (slug.length > 0 && (hasFeatured || pageParam !== null || perPageParam !== null)) {
    return error(422, 'VALIDATION_ERROR', 'slug cannot be combined with other selectors.');
  }

  if ((pageParam !== null || perPageParam !== null) && page !== 'insights') {
    return error(422, 'VALIDATION_ERROR', 'page and perPage are only supported for insights list mode.');
  }

  if (hasFeatured && page !== 'projects') {
    return error(422, 'VALIDATION_ERROR', 'featured is only supported for projects.');
  }

  if ((page === 'home' || page === 'about' || page === 'contact') && Array.from(searchParams.keys()).length > 0) {
    return error(422, 'VALIDATION_ERROR', `Query parameters are not supported for ${page}.`);
  }

  try {
    if (page === 'home' || page === 'about') {
      return ok(buildPageResponse(page));
    }

    if (page === 'projects') {
      if (slug === 'trigger-internal-error') {
        throw new Error('Triggered internal error for route-level failure coverage.');
      }

      if (slug.length > 0) {
        const project = findBySlug(PROJECTS_CONTENT.sections, slug);

        if (!project) {
          return error(404, 'NOT_FOUND', 'Project content was not found for the requested slug.', {
            slug
          });
        }

        return ok(
          buildContentPageResponse(
            'projects',
            PROJECTS_CONTENT.title,
            [project],
            PROJECTS_CONTENT.lastUpdated
          )
        );
      }

      const listSections =
        featured === true ? selectFeaturedItems(PROJECTS_CONTENT.sections) : PROJECTS_CONTENT.sections;

      return ok(
        buildContentPageResponse(
          'projects',
          PROJECTS_CONTENT.title,
          listSections,
          PROJECTS_CONTENT.lastUpdated
        )
      );
    }

    if (page === 'research') {
      if (slug.length > 0) {
        const researchItem = findBySlug(RESEARCH_CONTENT.sections, slug);

        if (!researchItem) {
          return error(404, 'NOT_FOUND', 'Research content was not found for the requested slug.', {
            slug
          });
        }

        return ok(
          buildContentPageResponse(
            'research',
            RESEARCH_CONTENT.title,
            [researchItem],
            RESEARCH_CONTENT.lastUpdated
          )
        );
      }

      return ok(
        buildContentPageResponse(
          'research',
          RESEARCH_CONTENT.title,
          RESEARCH_CONTENT.sections,
          RESEARCH_CONTENT.lastUpdated
        )
      );
    }

    if (page === 'contact') {
      return ok(buildPageResponse('contact'));
    }

    if (slug.length > 0) {
      const insight = findBySlug(INSIGHTS_CONTENT.sections, slug);

      if (!insight) {
        return error(404, 'NOT_FOUND', 'Insight content was not found for the requested slug.', {
          slug
        });
      }

      return ok(
        buildContentPageResponse('insights', INSIGHTS_CONTENT.title, [insight], INSIGHTS_CONTENT.lastUpdated)
      );
    }

    const orderedInsights = [...INSIGHTS_CONTENT.sections].sort((a, b) => {
      const dateA = Date.parse(a.publishedAt ?? a.updatedAt);
      const dateB = Date.parse(b.publishedAt ?? b.updatedAt);
      return dateB - dateA;
    });

    return ok(
      buildPaginatedContentResponse(INSIGHTS_CONTENT.title, orderedInsights, INSIGHTS_CONTENT.lastUpdated, {
        page: parsedPage ?? undefined,
        perPage: parsedPerPage ?? undefined,
        defaultPage: 1,
        defaultPerPage: 10,
        maxPerPage: 20
      })
    );
  } catch {
    return error(500, 'INTERNAL_ERROR', 'An internal error occurred while building public content.');
  }
}
