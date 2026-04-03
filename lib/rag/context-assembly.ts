import type { RetrievedRAGChunk } from '@/lib/rag/retrieval';

export function assembleRAGContext(_chunks: RetrievedRAGChunk[]): string {
  throw new Error('Not implemented');
}

export function mapRAGSources(_chunks: RetrievedRAGChunk[]): Array<{
  title: string;
  url: string;
  relevance: number;
}> {
  throw new Error('Not implemented');
}
