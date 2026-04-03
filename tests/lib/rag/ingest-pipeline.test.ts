import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runManualRAGIngest } from '@/lib/rag/ingest';
import { loadApprovedRAGSources } from '@/lib/rag/content-source';
import { chunkMarkdownDocument, type RAGChunk } from '@/lib/rag/chunking';
import { embedRAGChunks } from '@/lib/rag/embedding';
import { writeRAGChunks } from '@/lib/rag/vector-store';
import { executeLLMQuery, streamLLMQuery } from '@/lib/llm/server';

vi.mock('@/lib/rag/content-source', () => ({
  loadApprovedRAGSources: vi.fn()
}));

vi.mock('@/lib/rag/chunking', () => ({
  chunkMarkdownDocument: vi.fn()
}));

vi.mock('@/lib/rag/embedding', () => ({
  embedRAGChunks: vi.fn()
}));

vi.mock('@/lib/rag/vector-store', () => ({
  writeRAGChunks: vi.fn()
}));

vi.mock('@/lib/llm/server', () => ({
  executeLLMQuery: vi.fn(),
  streamLLMQuery: vi.fn()
}));

const mockedLoadApprovedRAGSources = vi.mocked(loadApprovedRAGSources);
const mockedChunkMarkdownDocument = vi.mocked(chunkMarkdownDocument);
const mockedEmbedRAGChunks = vi.mocked(embedRAGChunks);
const mockedWriteRAGChunks = vi.mocked(writeRAGChunks);
const mockedExecuteLLMQuery = vi.mocked(executeLLMQuery);
const mockedStreamLLMQuery = vi.mocked(streamLLMQuery);

const SOURCE_DOCUMENTS = [
  {
    sourceFile: 'about.md',
    markdown: '## About\nApplied AI work in industrial settings.',
    pageSlug: '/about'
  },
  {
    sourceFile: 'projects.md',
    markdown: '## Projects\nCurrent and selected project delivery notes.',
    pageSlug: '/projects'
  }
] as const;

const CHUNKS_BY_FILE: Record<string, RAGChunk[]> = {
  'about.md': [
    {
      chunkId: 'about-0',
      sourceFile: 'about.md',
      sectionHeading: 'About',
      chunkIndex: 0,
      tokenCount: 7,
      contentText: 'Applied AI work in industrial settings.',
      pageSlug: '/about'
    }
  ],
  'projects.md': [
    {
      chunkId: 'projects-0',
      sourceFile: 'projects.md',
      sectionHeading: 'Projects',
      chunkIndex: 0,
      tokenCount: 6,
      contentText: 'Current and selected project delivery notes.',
      pageSlug: '/projects'
    },
    {
      chunkId: 'projects-1',
      sourceFile: 'projects.md',
      sectionHeading: 'Projects',
      chunkIndex: 1,
      tokenCount: 5,
      contentText: 'Additional implementation detail for context.',
      pageSlug: '/projects'
    }
  ]
};

const ALL_CHUNKS = [...CHUNKS_BY_FILE['about.md'], ...CHUNKS_BY_FILE['projects.md']];

const EMBEDDING_RESPONSE = {
  embeddingModel: 'text-embedding-3-large',
  vectors: [[0.11, 0.12], [0.21, 0.22], [0.31, 0.32]]
};

beforeEach(() => {
  mockedLoadApprovedRAGSources.mockReset();
  mockedChunkMarkdownDocument.mockReset();
  mockedEmbedRAGChunks.mockReset();
  mockedWriteRAGChunks.mockReset();
  mockedExecuteLLMQuery.mockReset();
  mockedStreamLLMQuery.mockReset();

  mockedLoadApprovedRAGSources.mockResolvedValue([...SOURCE_DOCUMENTS]);

  mockedChunkMarkdownDocument.mockImplementation(({ sourceFile }) => {
    return CHUNKS_BY_FILE[sourceFile] ?? [];
  });

  mockedEmbedRAGChunks.mockResolvedValue({ ...EMBEDDING_RESPONSE });
  mockedWriteRAGChunks.mockResolvedValue({ chunksWritten: ALL_CHUNKS.length });
});

describe('runManualRAGIngest pipeline orchestration', () => {
  it('loads approved markdown sources from the content loader seam', async () => {
    await runManualRAGIngest();

    expect(mockedLoadApprovedRAGSources).toHaveBeenCalledTimes(1);
    expect(mockedLoadApprovedRAGSources).toHaveBeenCalledWith(undefined);
  });

  it('chunks all returned source files via the chunking seam', async () => {
    await runManualRAGIngest();

    expect(mockedChunkMarkdownDocument).toHaveBeenCalledTimes(SOURCE_DOCUMENTS.length);
    for (const document of SOURCE_DOCUMENTS) {
      expect(mockedChunkMarkdownDocument).toHaveBeenCalledWith({
        sourceFile: document.sourceFile,
        markdown: document.markdown,
        pageSlug: document.pageSlug
      });
    }
  });

  it('requests embeddings for every produced chunk through the embedding seam', async () => {
    await runManualRAGIngest();

    expect(mockedEmbedRAGChunks).toHaveBeenCalledTimes(1);

    const [embeddingInput] = mockedEmbedRAGChunks.mock.calls[0];
    expect(embeddingInput).toHaveLength(ALL_CHUNKS.length);
    expect(embeddingInput.map((chunk) => chunk.contentText)).toEqual(
      ALL_CHUNKS.map((chunk) => chunk.contentText)
    );
  });

  it('writes chunk rows through the vector-store seam', async () => {
    await runManualRAGIngest();

    expect(mockedWriteRAGChunks).toHaveBeenCalledTimes(1);
    expect(mockedWriteRAGChunks).toHaveBeenCalledWith({
      chunks: ALL_CHUNKS,
      vectors: EMBEDDING_RESPONSE.vectors,
      forceReingest: undefined
    });
  });

  it('returns a success summary with ingest totals, timing, model, status, and empty errors', async () => {
    const summary = await runManualRAGIngest();

    expect(summary).toMatchObject({
      filesProcessed: SOURCE_DOCUMENTS.length,
      chunksCreated: ALL_CHUNKS.length,
      embeddingModel: EMBEDDING_RESPONSE.embeddingModel,
      status: 'success',
      errors: []
    });
    expect(summary.durationMs).toEqual(expect.any(Number));
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns failed status with errors when one source file fails chunking and still reports attempted file count', async () => {
    mockedChunkMarkdownDocument.mockImplementation(({ sourceFile }) => {
      if (sourceFile === 'projects.md') {
        throw new Error('Chunking failure for projects.md');
      }

      return CHUNKS_BY_FILE[sourceFile] ?? [];
    });

    const summary = await runManualRAGIngest();

    expect(summary.status).toBe('failed');
    expect(summary.filesProcessed).toBe(SOURCE_DOCUMENTS.length);
    expect(summary.errors.length).toBeGreaterThan(0);
  });

  it('passes forceReingest through to the vector-store seam', async () => {
    await runManualRAGIngest({ forceReingest: true });

    expect(mockedWriteRAGChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        forceReingest: true
      })
    );
  });

  it('does not perform retrieval or query-time LLM work during ingest', async () => {
    await runManualRAGIngest();

    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
    expect(mockedStreamLLMQuery).not.toHaveBeenCalled();
  });
});
