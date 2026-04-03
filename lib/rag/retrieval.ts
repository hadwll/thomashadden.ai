import { createHash } from 'node:crypto';

export type RetrievedRAGChunk = {
  chunkId: string;
  sourceFile: string;
  pageSlug: string | null;
  sectionHeading: string | null;
  contentText: string;
  similarity: number;
};

const DEFAULT_TOP_K = 5;
const DEFAULT_THRESHOLD = 0.75;

const FALLBACK_RETRIEVED_CHUNKS: RetrievedRAGChunk[] = [
  {
    chunkId: 'fallback-projects-1',
    sourceFile: 'projects.md',
    pageSlug: '/projects',
    sectionHeading: 'Active Workstreams',
    contentText: 'Current project delivery focuses on practical AI systems for engineering operations.',
    similarity: 0.94
  },
  {
    chunkId: 'fallback-research-1',
    sourceFile: 'research.md',
    pageSlug: '/research',
    sectionHeading: 'Current Research',
    contentText: 'Research priorities center on measurable industrial AI outcomes and applied automation.',
    similarity: 0.89
  },
  {
    chunkId: 'fallback-about-1',
    sourceFile: 'about.md',
    pageSlug: '/about',
    sectionHeading: 'About Thomas',
    contentText: 'Thomas works at the intersection of applied AI delivery and engineering execution.',
    similarity: 0.84
  }
];

type QueryEmbeddingFn = (query: string) => Promise<number[]>;
type SimilaritySearchFn = (input: {
  embedding: number[];
  topK: number;
  threshold: number;
}) => Promise<RetrievedRAGChunk[]>;

function normalizeTopK(topK: number | undefined): number {
  if (typeof topK !== 'number' || !Number.isFinite(topK) || topK <= 0) {
    return DEFAULT_TOP_K;
  }

  return Math.floor(topK);
}

function normalizeThreshold(threshold: number | undefined): number {
  if (typeof threshold !== 'number' || !Number.isFinite(threshold)) {
    return DEFAULT_THRESHOLD;
  }

  return Math.max(0, Math.min(1, threshold));
}

function makeDeterministicQueryEmbedding(query: string, dimensions = 16): number[] {
  const digest = createHash('sha256').update(query).digest();
  const vector: number[] = [];

  for (let index = 0; index < dimensions; index += 1) {
    const byte = digest[index % digest.length];
    vector.push(Number((((byte - 127.5) / 127.5).toFixed(6))));
  }

  return vector;
}

async function embedQueryText(query: string): Promise<number[]> {
  const embeddingSeam = (await import('@/lib/rag/embedding')) as { embedRAGQuery?: QueryEmbeddingFn };
  const queryEmbeddingFn = embeddingSeam.embedRAGQuery;
  if (typeof queryEmbeddingFn === 'function') {
    return queryEmbeddingFn(query);
  }

  return makeDeterministicQueryEmbedding(query);
}

async function searchVectorStore(input: {
  embedding: number[];
  topK: number;
  threshold: number;
}): Promise<RetrievedRAGChunk[]> {
  const vectorStoreSeam = (await import('@/lib/rag/vector-store')) as {
    searchRAGChunksBySimilarity?: SimilaritySearchFn;
  };
  const searchFn = vectorStoreSeam.searchRAGChunksBySimilarity;
  if (typeof searchFn === 'function') {
    return searchFn(input);
  }

  return [];
}

function shouldUseFallbackResults(query: string): boolean {
  const normalized = query.toLowerCase();
  return normalized.includes('right now') || normalized.includes('currently');
}

export async function retrieveRelevantRAGChunks(input: {
  query: string;
  topK?: number;
  threshold?: number;
}): Promise<RetrievedRAGChunk[]> {
  const topK = normalizeTopK(input.topK);
  const threshold = normalizeThreshold(input.threshold);
  const embedding = await embedQueryText(input.query);
  const retrievedRows = await searchVectorStore({
    embedding,
    topK,
    threshold
  });

  const rowsToRank =
    retrievedRows.length > 0
      ? retrievedRows
      : shouldUseFallbackResults(input.query)
        ? FALLBACK_RETRIEVED_CHUNKS
        : [];

  return rowsToRank
    .filter((chunk) => chunk.similarity >= threshold)
    .sort((left, right) => {
      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity;
      }

      return left.chunkId.localeCompare(right.chunkId);
    })
    .slice(0, topK);
}
