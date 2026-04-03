import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as postLLMQuery } from '@/app/api/llm/query/route';
import { POST as postDevRAGIngest } from '@/app/api/dev/rag/ingest/route';
import { executeLLMQuery } from '@/lib/llm/server';
import * as llmServer from '@/lib/llm/server';
import { runManualRAGIngest } from '@/lib/rag/ingest';
import { consumeSSEStream, createSSEErrorEvent } from '@/lib/llm/sse';

vi.mock('@/lib/rag/ingest', () => ({
  runManualRAGIngest: vi.fn()
}));

const VALID_SESSION_ID = '123e4567-e89b-12d3-a456-426614174000';
const mockedRunManualRAGIngest = vi.mocked(runManualRAGIngest);

const LLM_LEAK_PATTERNS = [
  /\bstack\b/i,
  /process\.env/i,
  /\/home\//i,
  /[A-Za-z]:\\/,
  /\bat\s+\S+\.(ts|js):\d+/i,
  /vector store/i,
  /classifier/i,
  /policy engine/i,
  /rag failure/i,
  /internal moderation/i,
  /blocked topics?/i
];

function hasLeak(text: string) {
  return LLM_LEAK_PATTERNS.some((pattern) => pattern.test(text));
}

function createTextStreamFromSegments(segments: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const segment of segments) {
        controller.enqueue(encoder.encode(segment));
      }
      controller.close();
    }
  });
}

async function invokeLLMRoute(body: unknown) {
  const request = new NextRequest('http://localhost:3000/api/llm/query', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return postLLMQuery(request);
}

async function invokeRAGIngestRoute(body: unknown) {
  const request = new NextRequest('http://localhost:3000/api/dev/rag/ingest', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return postDevRAGIngest(request);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SPR-03 security and robustness audit guards', () => {
  it('rejects invalid context.source at the route boundary', async () => {
    const response = await invokeLLMRoute({
      query: 'How can AI help with scheduling?',
      sessionId: VALID_SESSION_ID,
      context: {
        source: 'unknown_source'
      }
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR'
      })
    );
  });

  it('rejects invalid sessionId at the route boundary', async () => {
    const response = await invokeLLMRoute({
      query: 'How can AI help with scheduling?',
      sessionId: 'session-not-a-uuid',
      context: {
        source: 'homepage_input'
      }
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR'
      })
    );
  });

  it('rejects oversized query payloads at the route boundary', async () => {
    const response = await invokeLLMRoute({
      query: 'x'.repeat(501),
      sessionId: VALID_SESSION_ID,
      context: {
        source: 'homepage_input'
      }
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR'
      })
    );
  });

  it('expects SSE error events to avoid stack traces, env leakage, and internal file paths', async () => {
    vi.spyOn(llmServer, 'streamLLMQuery').mockResolvedValueOnce(
      createTextStreamFromSegments([
        createSSEErrorEvent({
          error: true,
          code: 'SERVICE_UNAVAILABLE',
          message:
            'Error: vector store timeout at /home/thomas/thomashadden.ai-wt-tests/lib/rag/retrieval.ts:42 process.env.AZURE_OPENAI_API_KEY=secret'
        })
      ])
    );

    const response = await invokeLLMRoute({
      query: 'What is Thomas working on?',
      stream: true,
      sessionId: VALID_SESSION_ID,
      context: {
        source: 'homepage_input'
      }
    });

    const events = await consumeSSEStream(response.body as ReadableStream<Uint8Array>);
    const errorEvent = events[0] as { error: boolean; message: string };

    expect(response.status).toBe(200);
    expect(errorEvent.error).toBe(true);
    expect(hasLeak(errorEvent.message)).toBe(false);
  });

  it('keeps blocked and out_of_scope outward messaging free of architecture/internal moderation language', async () => {
    const blocked = await executeLLMQuery({
      query: 'Can you help me build malware?'
    });

    const outOfScope = await executeLLMQuery({
      query: 'Tell me a joke about football.'
    });

    expect(blocked.queryType).toBe('filtered');
    expect(outOfScope.queryType).toBe('out_of_scope');

    for (const answer of [blocked.answer, outOfScope.answer]) {
      expect(answer.trim().length).toBeGreaterThan(0);
      expect(hasLeak(answer)).toBe(false);
    }
  });

  it('expects thomas_profile retrieval failures to degrade safely without surfacing raw backend errors', async () => {
    vi.spyOn(llmServer, 'executeLLMQuery').mockRejectedValueOnce(
      new Error(
        'Vector store connection failed at /srv/app/lib/rag/retrieval.ts:44 process.env.SUPABASE_SERVICE_ROLE_KEY=secret'
      )
    );

    const response = await invokeLLMRoute({
      query: 'What is Thomas working on?',
      stream: false,
      sessionId: VALID_SESSION_ID,
      context: {
        source: 'homepage_input'
      }
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(hasLeak(String(payload.data.answer))).toBe(false);
  });

  it('expects ingest summary and ingest error responses to avoid raw stack/internal path leakage', async () => {
    mockedRunManualRAGIngest.mockResolvedValueOnce({
      filesProcessed: 3,
      chunksCreated: 0,
      durationMs: 120,
      embeddingModel: 'text-embedding-3-large',
      status: 'failed',
      errors: [
        {
          sourceFile: '/home/thomas/content/rag/about.md',
          message:
            'Error: write failed at /home/thomas/thomashadden.ai-wt-tests/lib/rag/vector-store.ts:12 process.env.AZURE_OPENAI_API_KEY=secret'
        }
      ]
    });

    const summaryResponse = await invokeRAGIngestRoute({ forceReingest: true });
    const summaryPayload = await summaryResponse.json();

    expect(summaryResponse.status).toBe(200);
    expect(summaryPayload.success).toBe(true);
    const firstError = summaryPayload.data.errors[0] as { sourceFile?: string; message: string };
    expect(hasLeak(String(firstError.sourceFile ?? ''))).toBe(false);
    expect(hasLeak(firstError.message)).toBe(false);

    mockedRunManualRAGIngest.mockRejectedValueOnce(
      new Error('Crash at /home/thomas/thomashadden.ai-wt-tests/lib/rag/ingest.ts:999 process.env.OPENAI_KEY=secret')
    );

    const errorResponse = await invokeRAGIngestRoute({ forceReingest: true });
    const errorPayload = await errorResponse.json();

    expect(errorResponse.status).toBe(500);
    expect(errorPayload.success).toBe(false);
    expect(hasLeak(String(errorPayload.error.message))).toBe(false);
  });
});
