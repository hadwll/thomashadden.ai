import type {
  ContentPageResponse,
  PaginatedContentResponse,
  PublicContentQueryOptions
} from '@/lib/content/types';

type ApiEnvelope<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error?: {
        code?: string;
        message?: string;
      };
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasSectionsArray(value: unknown): value is { sections: unknown[] } {
  return isObject(value) && Array.isArray(value.sections);
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function getServerBaseUrl(): string {
  const envBaseUrl =
    process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? process.env.APP_URL;

  if (envBaseUrl && isAbsoluteHttpUrl(envBaseUrl)) {
    return envBaseUrl;
  }

  const port = process.env.PORT ?? '3000';
  return `http://127.0.0.1:${port}`;
}

function resolveFetchPath(path: string): string {
  if (isAbsoluteHttpUrl(path)) {
    return path;
  }

  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
    return path;
  }

  return new URL(path, getServerBaseUrl()).toString();
}

function buildQueryPath(path: string, params: Array<[string, string]>): string {
  if (params.length === 0) {
    return path;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of params) {
    searchParams.append(key, value);
  }

  return `${path}?${searchParams.toString()}`;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!isObject(payload)) {
    return null;
  }

  if (!('error' in payload) || !isObject(payload.error)) {
    return null;
  }

  const { message, code } = payload.error as { message?: unknown; code?: unknown };
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (typeof code === 'string' && code.length > 0) {
    return code;
  }

  return null;
}

async function fetchContentData<T>(path: string, options?: { requireNonEmptySections?: boolean }): Promise<T> {
  const response = await fetch(resolveFetchPath(path));

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Malformed content payload');
  }

  if (!response.ok) {
    const fallback = `Content request failed with status ${response.status}`;
    throw new Error(extractErrorMessage(payload) ?? fallback);
  }

  if (!isObject(payload) || typeof payload.success !== 'boolean') {
    throw new Error('Malformed content payload');
  }

  if (payload.success === false) {
    throw new Error(extractErrorMessage(payload) ?? 'Content request failed');
  }

  const envelope = payload as ApiEnvelope<T>;
  if (!('data' in envelope) || envelope.data === null || envelope.data === undefined) {
    throw new Error('Malformed content payload');
  }

  if (options?.requireNonEmptySections) {
    if (!hasSectionsArray(envelope.data) || envelope.data.sections.length === 0) {
      throw new Error('Content not found');
    }
  }

  return envelope.data;
}

export async function getHomeContent(): Promise<ContentPageResponse> {
  return fetchContentData<ContentPageResponse>('/api/content/home');
}

export async function getAboutContent(): Promise<ContentPageResponse> {
  return fetchContentData<ContentPageResponse>('/api/content/about');
}

export async function getProjectsContent(
  options: PublicContentQueryOptions = {}
): Promise<ContentPageResponse> {
  const path = options.slug
    ? buildQueryPath('/api/content/projects', [['slug', options.slug]])
    : options.featured === true
      ? buildQueryPath('/api/content/projects', [['featured', 'true']])
      : '/api/content/projects';

  return fetchContentData<ContentPageResponse>(path, {
    requireNonEmptySections: Boolean(options.slug)
  });
}

export async function getResearchContent(
  options: PublicContentQueryOptions = {}
): Promise<ContentPageResponse> {
  const path = options.slug
    ? buildQueryPath('/api/content/research', [['slug', options.slug]])
    : '/api/content/research';

  return fetchContentData<ContentPageResponse>(path, {
    requireNonEmptySections: Boolean(options.slug)
  });
}

export async function getInsightsContent(
  options: PublicContentQueryOptions = {}
): Promise<PaginatedContentResponse | ContentPageResponse> {
  if (options.slug) {
    const slugPath = buildQueryPath('/api/content/insights', [['slug', options.slug]]);

    return fetchContentData<ContentPageResponse>(slugPath, {
      requireNonEmptySections: true
    });
  }

  const page = options.page ?? 1;
  const perPage = options.perPage ?? 10;
  const paginatedPath = buildQueryPath('/api/content/insights', [
    ['page', String(page)],
    ['perPage', String(perPage)]
  ]);

  return fetchContentData<PaginatedContentResponse>(paginatedPath);
}
