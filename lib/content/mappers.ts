import type {
  ContentPageResponse,
  PaginatedContentResponse,
  PublicContentItem,
  PublicContentPageKey
} from '@/lib/content/types';

type PaginationBuildOptions = {
  page?: number;
  perPage?: number;
  defaultPage?: number;
  defaultPerPage?: number;
  maxPerPage?: number;
};

function toPositiveInt(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const candidate = Math.trunc(value as number);
  return candidate >= 1 ? candidate : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function buildContentPageResponse(
  page: PublicContentPageKey,
  title: string,
  sections: PublicContentItem[],
  lastUpdated: string
): ContentPageResponse {
  return {
    page,
    title,
    sections: [...sections],
    lastUpdated
  };
}

export function buildPaginatedContentResponse(
  title: string,
  sections: PublicContentItem[],
  lastUpdated: string,
  options: PaginationBuildOptions = {}
): PaginatedContentResponse {
  const defaultPage = toPositiveInt(options.defaultPage, 1);
  const defaultPerPage = toPositiveInt(options.defaultPerPage, 10);
  const maxPerPage = toPositiveInt(options.maxPerPage, 20);

  const requestedPerPage = toPositiveInt(options.perPage, defaultPerPage);
  const safePerPage = clamp(requestedPerPage, 1, maxPerPage);

  const total = sections.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safePerPage);

  const requestedPage = toPositiveInt(options.page, defaultPage);
  const maxPage = totalPages === 0 ? 1 : totalPages;
  const safePage = clamp(requestedPage, 1, maxPage);

  const startIndex = (safePage - 1) * safePerPage;
  const pagedSections = sections.slice(startIndex, startIndex + safePerPage);

  return {
    page: safePage,
    perPage: safePerPage,
    total,
    totalPages,
    title,
    sections: pagedSections,
    lastUpdated,
    pagination: {
      total,
      page: safePage,
      perPage: safePerPage,
      totalPages
    }
  };
}

export function selectFeaturedItems(items: PublicContentItem[]): PublicContentItem[] {
  return items.filter((item) => item.featured === true);
}

export function findBySlug(items: PublicContentItem[], slug: string): PublicContentItem | null {
  return items.find((item) => item.slug === slug) ?? null;
}
