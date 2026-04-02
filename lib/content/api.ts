import type {
  ContentPageResponse,
  PaginatedContentResponse,
  PublicContentQueryOptions
} from '@/lib/content/types';

export async function getHomeContent(): Promise<ContentPageResponse> {
  return Promise.reject(new Error('Not implemented'));
}

export async function getAboutContent(): Promise<ContentPageResponse> {
  return Promise.reject(new Error('Not implemented'));
}

export async function getProjectsContent(
  _options: PublicContentQueryOptions = {}
): Promise<ContentPageResponse> {
  return Promise.reject(new Error('Not implemented'));
}

export async function getResearchContent(
  _options: PublicContentQueryOptions = {}
): Promise<ContentPageResponse> {
  return Promise.reject(new Error('Not implemented'));
}

export async function getInsightsContent(
  _options: PublicContentQueryOptions = {}
): Promise<PaginatedContentResponse | ContentPageResponse> {
  return Promise.reject(new Error('Not implemented'));
}
