import type { RAGChunk } from '@/lib/rag/chunking';
import type { EmbeddingVector } from '@/lib/rag/embedding';

export async function writeRAGChunks(input: {
  chunks: RAGChunk[];
  vectors: EmbeddingVector[];
  forceReingest?: boolean;
}): Promise<{ chunksWritten: number }> {
  if (input.chunks.length !== input.vectors.length) {
    throw new Error(
      `Chunk/vector count mismatch: received ${input.chunks.length} chunks and ${input.vectors.length} vectors.`
    );
  }

  void input.forceReingest;

  return {
    chunksWritten: input.chunks.length
  };
}
