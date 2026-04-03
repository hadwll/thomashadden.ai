export const PUBLIC_CONTENT_PAGE_KEYS = [
  'home',
  'about',
  'projects',
  'research',
  'insights',
  'contact'
] as const;

export type PublicContentPageKey = (typeof PUBLIC_CONTENT_PAGE_KEYS)[number];

export interface PublicContentItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  updatedAt: string;
  tags?: string[];
  status?: string;
  category?: string;
  theme?: string;
  location?: string;
  publishedAt?: string;
  featured?: boolean;
  imageUrl?: string;
}

export interface ContentPageResponse {
  page: PublicContentPageKey;
  title: string;
  sections: PublicContentItem[];
  lastUpdated: string;
}

export interface PaginatedContentResponse {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  title: string;
  sections: PublicContentItem[];
  lastUpdated: string;
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface PublicContentQueryOptions {
  slug?: string;
  featured?: boolean;
  page?: number;
  perPage?: number;
}

export function isPublicContentPageKey(value: string): value is PublicContentPageKey {
  return PUBLIC_CONTENT_PAGE_KEYS.includes(value as PublicContentPageKey);
}
