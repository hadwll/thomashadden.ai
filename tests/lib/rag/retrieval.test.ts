import { beforeEach, describe, expect, it, vi } from 'vitest';
import { retrieveRelevantRAGChunks, type RetrievedRAGChunk } from '@/lib/rag/retrieval';
import { assembleRAGContext, mapRAGSources } from '@/lib/rag/context-assembly';

const mockedEmbedRAGQuery = vi.fn();
const mockedSearchRAGChunksBySimilarity = vi.fn();

vi.mock('@/lib/rag/embedding', () => ({
  embedRAGQuery: mockedEmbedRAGQuery
}));

vi.mock('@/lib/rag/vector-store', () => ({
  searchRAGChunksBySimilarity: mockedSearchRAGChunksBySimilarity
}));

const RETRIEVED_CHUNKS: RetrievedRAGChunk[] = [
  {
    chunkId: 'projects-2',
    sourceFile: 'projects.md',
    pageSlug: '/projects',
    sectionHeading: 'Active Workstreams',
    contentText: 'Thomas is currently focused on practical connected-AI delivery paths for industry.',
    similarity: 0.94
  },
  {
    chunkId: 'research-4',
    sourceFile: 'research.md',
    pageSlug: '/research',
    sectionHeading: 'Current Research',
    contentText: 'Research emphasizes measurable automation outcomes across engineering operations.',
    similarity: 0.89
  },
  {
    chunkId: 'about-1',
    sourceFile: 'about.md',
    pageSlug: '/about',
    sectionHeading: null,
    contentText: 'Thomas works at the intersection of applied AI and operational improvement.',
    similarity: 0.82
  }
];

describe('retrieveRelevantRAGChunks', () => {
  beforeEach(() => {
    mockedEmbedRAGQuery.mockReset();
    mockedSearchRAGChunksBySimilarity.mockReset();
  });

  it('requests query embedding, passes defaults to vector search, and returns ordered thresholded chunks', async () => {
    mockedEmbedRAGQuery.mockResolvedValueOnce([0.11, 0.22, 0.33]);
    mockedSearchRAGChunksBySimilarity.mockResolvedValueOnce([
      RETRIEVED_CHUNKS[2],
      RETRIEVED_CHUNKS[0],
      {
        ...RETRIEVED_CHUNKS[1],
        similarity: 0.74
      }
    ]);

    const result = await retrieveRelevantRAGChunks({
      query: 'What is Thomas working on?'
    });

    expect(mockedEmbedRAGQuery).toHaveBeenCalledTimes(1);
    expect(mockedEmbedRAGQuery).toHaveBeenCalledWith('What is Thomas working on?');

    expect(mockedSearchRAGChunksBySimilarity).toHaveBeenCalledTimes(1);
    expect(mockedSearchRAGChunksBySimilarity).toHaveBeenCalledWith({
      embedding: [0.11, 0.22, 0.33],
      topK: 5,
      threshold: 0.75
    });

    expect(result.map((chunk) => chunk.chunkId)).toEqual(['projects-2', 'about-1']);
    expect(result.every((chunk) => chunk.similarity >= 0.75)).toBe(true);
  });

  it('returns an empty array when no retrieved rows satisfy the confidence threshold', async () => {
    mockedEmbedRAGQuery.mockResolvedValueOnce([0.41, 0.52, 0.63]);
    mockedSearchRAGChunksBySimilarity.mockResolvedValueOnce([
      {
        ...RETRIEVED_CHUNKS[0],
        similarity: 0.6
      },
      {
        ...RETRIEVED_CHUNKS[1],
        similarity: 0.58
      }
    ]);

    const result = await retrieveRelevantRAGChunks({
      query: 'What is Thomas working on right now?',
      topK: 3,
      threshold: 0.8
    });

    expect(mockedSearchRAGChunksBySimilarity).toHaveBeenCalledWith({
      embedding: [0.41, 0.52, 0.63],
      topK: 3,
      threshold: 0.8
    });
    expect(result).toEqual([]);
  });
});

describe('assembleRAGContext', () => {
  it('builds a deterministic context block with content and source markers in retrieval order', () => {
    const firstRun = assembleRAGContext(RETRIEVED_CHUNKS);
    const secondRun = assembleRAGContext(RETRIEVED_CHUNKS);

    expect(firstRun).toBe(secondRun);
    expect(firstRun).toContain(RETRIEVED_CHUNKS[0].contentText);
    expect(firstRun).toContain(RETRIEVED_CHUNKS[1].contentText);
    expect(firstRun).toContain(RETRIEVED_CHUNKS[2].contentText);
    expect((firstRun.match(/Source:/g) ?? []).length).toBe(RETRIEVED_CHUNKS.length);

    expect(firstRun.indexOf(RETRIEVED_CHUNKS[0].contentText)).toBeLessThan(
      firstRun.indexOf(RETRIEVED_CHUNKS[1].contentText)
    );
    expect(firstRun.indexOf(RETRIEVED_CHUNKS[1].contentText)).toBeLessThan(
      firstRun.indexOf(RETRIEVED_CHUNKS[2].contentText)
    );
  });

  it('returns an empty string when no chunks are supplied', () => {
    expect(assembleRAGContext([])).toBe('');
  });
});

describe('mapRAGSources', () => {
  it('maps chunks to outward sources with URL/title derivation, dedupe, max relevance, and relevance sorting', () => {
    const mapped = mapRAGSources([
      {
        ...RETRIEVED_CHUNKS[0],
        chunkId: 'projects-1',
        similarity: 0.88
      },
      RETRIEVED_CHUNKS[0],
      RETRIEVED_CHUNKS[1],
      {
        ...RETRIEVED_CHUNKS[2],
        pageSlug: '/about'
      }
    ]);

    expect(mapped.map((source) => source.url)).toEqual(['/projects', '/research', '/about']);
    expect(mapped[0]?.relevance).toBe(0.94);
    expect(mapped[1]?.relevance).toBe(0.89);
    expect(mapped[2]?.relevance).toBe(0.82);

    expect(mapped[0]?.title).toMatch(/active workstreams|projects/i);
    expect(mapped[1]?.title).toMatch(/research/i);
    expect(mapped[2]?.title).toMatch(/about|home\.md|about\.md/i);
  });
});
