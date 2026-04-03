import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeLLMQuery } from '@/lib/llm/server';
import { classifyLLMQuery } from '@/lib/llm/classifier';
import { retrieveRelevantRAGChunks, type RetrievedRAGChunk } from '@/lib/rag/retrieval';
import { assembleRAGContext, mapRAGSources } from '@/lib/rag/context-assembly';

vi.mock('@/lib/llm/classifier', () => ({
  classifyLLMQuery: vi.fn()
}));

vi.mock('@/lib/rag/retrieval', () => ({
  retrieveRelevantRAGChunks: vi.fn()
}));

vi.mock('@/lib/rag/context-assembly', () => ({
  assembleRAGContext: vi.fn(),
  mapRAGSources: vi.fn()
}));

const mockedClassifyLLMQuery = vi.mocked(classifyLLMQuery);
const mockedRetrieveRelevantRAGChunks = vi.mocked(retrieveRelevantRAGChunks);
const mockedAssembleRAGContext = vi.mocked(assembleRAGContext);
const mockedMapRAGSources = vi.mocked(mapRAGSources);

const THOMAS_QUERY = 'What is Thomas working on?';

const RAG_CHUNKS: RetrievedRAGChunk[] = [
  {
    chunkId: 'projects-2',
    sourceFile: 'projects.md',
    pageSlug: '/projects',
    sectionHeading: 'Active Workstreams',
    contentText: 'Thomas is actively delivering applied AI projects in industrial settings.',
    similarity: 0.93
  },
  {
    chunkId: 'research-1',
    sourceFile: 'research.md',
    pageSlug: '/research',
    sectionHeading: 'Current Research',
    contentText: 'Current research focuses on practical AI deployment and measurable outcomes.',
    similarity: 0.88
  }
];

const MAPPED_SOURCES = [
  {
    title: 'Active Workstreams',
    url: '/projects',
    relevance: 0.93
  },
  {
    title: 'Current Research',
    url: '/research',
    relevance: 0.88
  }
] as const;

describe('executeLLMQuery Thomas-profile routing with retrieval integration', () => {
  beforeEach(() => {
    mockedClassifyLLMQuery.mockReset();
    mockedRetrieveRelevantRAGChunks.mockReset();
    mockedAssembleRAGContext.mockReset();
    mockedMapRAGSources.mockReset();
  });

  it('routes thomas_profile queries through retrieval, returns non-empty answer, and maps retrieved sources', async () => {
    mockedClassifyLLMQuery.mockResolvedValueOnce('thomas_profile');
    mockedRetrieveRelevantRAGChunks.mockResolvedValueOnce(RAG_CHUNKS);
    mockedAssembleRAGContext.mockReturnValueOnce('CONTEXT FROM THOMAS\'S SITE: ...');
    mockedMapRAGSources.mockReturnValueOnce([...MAPPED_SOURCES]);

    const response = await executeLLMQuery({
      query: THOMAS_QUERY
    });

    expect(mockedRetrieveRelevantRAGChunks).toHaveBeenCalledTimes(1);
    expect(mockedRetrieveRelevantRAGChunks).toHaveBeenCalledWith({
      query: THOMAS_QUERY
    });
    expect(mockedAssembleRAGContext).toHaveBeenCalledWith(RAG_CHUNKS);
    expect(mockedMapRAGSources).toHaveBeenCalledWith(RAG_CHUNKS);

    expect(response.queryType).toBe('thomas_profile');
    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.sources).toEqual(MAPPED_SOURCES);
    expect(response.sources.length).toBeGreaterThan(0);
    expect(response.suggestedActions).toEqual([]);
  });

  it('keeps thomas_profile queryType with no relevant chunks while returning a bounded non-empty fallback and empty sources', async () => {
    mockedClassifyLLMQuery.mockResolvedValueOnce('thomas_profile');
    mockedRetrieveRelevantRAGChunks.mockResolvedValueOnce([]);
    mockedAssembleRAGContext.mockReturnValueOnce('');
    mockedMapRAGSources.mockReturnValueOnce([]);

    const response = await executeLLMQuery({
      query: THOMAS_QUERY
    });

    expect(mockedRetrieveRelevantRAGChunks).toHaveBeenCalledTimes(1);
    expect(mockedMapRAGSources).toHaveBeenCalledWith([]);
    expect(response.queryType).toBe('thomas_profile');
    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.answer.length).toBeLessThanOrEqual(600);
    expect(response.sources).toEqual([]);
  });

  it('degrades gracefully when retrieval throws, preserving thomas_profile and returning safe output shape', async () => {
    mockedClassifyLLMQuery.mockResolvedValueOnce('thomas_profile');
    mockedRetrieveRelevantRAGChunks.mockRejectedValueOnce(new Error('vector store unavailable'));

    const response = await executeLLMQuery({
      query: THOMAS_QUERY
    });

    expect(mockedRetrieveRelevantRAGChunks).toHaveBeenCalledTimes(1);
    expect(mockedAssembleRAGContext).not.toHaveBeenCalled();
    expect(mockedMapRAGSources).not.toHaveBeenCalled();
    expect(response.queryType).toBe('thomas_profile');
    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.sources).toEqual([]);
  });

  it('does not call retrieval for general_ai classification', async () => {
    mockedClassifyLLMQuery.mockResolvedValueOnce('general_ai');

    const response = await executeLLMQuery({
      query: 'What is RAG?'
    });

    expect(response.queryType).toBe('general_ai');
    expect(mockedRetrieveRelevantRAGChunks).not.toHaveBeenCalled();
    expect(mockedMapRAGSources).not.toHaveBeenCalled();
  });

  it('does not call retrieval for readiness_check classification', async () => {
    mockedClassifyLLMQuery.mockResolvedValueOnce('readiness_check');

    const response = await executeLLMQuery({
      query: 'How do I know if AI is right for us?'
    });

    expect(response.queryType).toBe('general_ai');
    expect(mockedRetrieveRelevantRAGChunks).not.toHaveBeenCalled();
    expect(mockedMapRAGSources).not.toHaveBeenCalled();
  });
});
