export type RAGChunk = {
  chunkId: string;
  sourceFile: string;
  sectionHeading: string | null;
  chunkIndex: number;
  tokenCount: number;
  contentText: string;
  pageSlug: string | null;
};

export function chunkMarkdownDocument(input: {
  sourceFile: string;
  markdown: string;
  pageSlug?: string | null;
  targetChunkTokens?: number;
  maxChunkTokens?: number;
  overlapTokens?: number;
  minChunkTokens?: number;
}): RAGChunk[] {
  void input;
  throw new Error('Not implemented');
}
