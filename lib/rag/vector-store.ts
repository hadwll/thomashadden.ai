import type { RAGChunk } from '@/lib/rag/chunking';
import type { EmbeddingVector } from '@/lib/rag/embedding';

export async function writeRAGChunks(input: {
  chunks: RAGChunk[];
  vectors: EmbeddingVector[];
  forceReingest?: boolean;
}): Promise<{ chunksWritten: number }> {
  void input;
  throw new Error('Not implemented');
}
