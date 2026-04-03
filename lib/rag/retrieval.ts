export type RetrievedRAGChunk = {
  chunkId: string;
  sourceFile: string;
  pageSlug: string | null;
  sectionHeading: string | null;
  contentText: string;
  similarity: number;
};

export async function retrieveRelevantRAGChunks(input: {
  query: string;
  topK?: number;
  threshold?: number;
}): Promise<RetrievedRAGChunk[]> {
  void input;
  throw new Error('Not implemented');
}
