export type PublicContentPage = 'home' | 'about' | 'projects' | 'research' | 'insights';

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
  page: PublicContentPage | string;
  title: string;
  sections: PublicContentItem[];
  lastUpdated: string;
}

export interface PaginatedContentResponse {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  sections: PublicContentItem[];
}

export interface PublicContentQueryOptions {
  slug?: string;
  featured?: boolean;
  page?: number;
  perPage?: number;
}
