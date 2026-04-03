export type EmbeddingVector = number[];

export async function embedRAGChunks(_chunks: Array<{ contentText: string }>): Promise<{
  embeddingModel: string;
  vectors: EmbeddingVector[];
}> {
  throw new Error('Not implemented');
}
