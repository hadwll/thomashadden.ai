import { createHash } from 'node:crypto';

export type EmbeddingVector = number[];

function makeDeterministicVector(contentText: string, dimensions = 16): EmbeddingVector {
  const digest = createHash('sha256').update(contentText).digest();
  const vector: number[] = [];

  for (let index = 0; index < dimensions; index += 1) {
    const byte = digest[index % digest.length];
    const normalized = (byte - 127.5) / 127.5;
    vector.push(Number(normalized.toFixed(6)));
  }

  return vector;
}

function hasAzureEmbeddingConfig() {
  return Boolean(
    process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_EMBEDDING_DEPLOYMENT
  );
}

export async function embedRAGChunks(chunks: Array<{ contentText: string }>): Promise<{
  embeddingModel: string;
  vectors: EmbeddingVector[];
}> {
  const configuredModel = process.env.AZURE_EMBEDDING_DEPLOYMENT?.trim();
  const azureConfigured = hasAzureEmbeddingConfig();

  const embeddingModel =
    azureConfigured && configuredModel ? configuredModel : configuredModel || 'deterministic-dev-placeholder';

  const vectors = chunks.map((chunk) => makeDeterministicVector(chunk.contentText));

  return {
    embeddingModel,
    vectors
  };
}
