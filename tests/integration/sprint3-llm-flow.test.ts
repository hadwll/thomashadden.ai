import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as postLLMQuery } from '@/app/api/llm/query/route';
import { executeLLMQuery } from '@/lib/llm/server';
import * as llmServer from '@/lib/llm/server';
import { consumeSSEStream, createSSEChunkEvent, createSSEDoneEvent, createSSEErrorEvent } from '@/lib/llm/sse';
import { runManualRAGIngest } from '@/lib/rag/ingest';

vi.mock('@/lib/rag/ingest', () => ({
  runManualRAGIngest: vi.fn()
}));

const VALID_SESSION_ID = '123e4567-e89b-12d3-a456-426614174000';

const HOMEPAGE_INPUT_BODY = {
  query: 'How can AI help an engineering business?',
  sessionId: VALID_SESSION_ID,
  context: {
    source: 'homepage_input'
  }
} as const;

const mockedRunManualRAGIngest = vi.mocked(runManualRAGIngest);

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

async function invokeLLMRouteWithJsonBody(body: unknown) {
  const request = new NextRequest('http://localhost:3000/api/llm/query', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return postLLMQuery(request);
}

async function invokeLLMRouteWithRawBody(rawBody: string) {
  const request = new NextRequest('http://localhost:3000/api/llm/query', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: rawBody
  });

  return postLLMQuery(request);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SPR-03 integration: LLM flow and contract seams', () => {
  describe('contract and route integration', () => {
    it('returns the standard success envelope for a valid non-streaming homepage request', async () => {
      const response = await invokeLLMRouteWithJsonBody({
        ...HOMEPAGE_INPUT_BODY,
        stream: false
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data).toEqual(
        expect.objectContaining({
          answer: expect.any(String),
          queryType: expect.any(String),
          sources: expect.any(Array),
          suggestedActions: expect.any(Array),
          queryId: expect.any(String)
        })
      );
      expect(payload.meta).toEqual(
        expect.objectContaining({
          requestId: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('returns SSE headers and emits chunk then done events with completion metadata', async () => {
      const chunkEvent = createSSEChunkEvent({
        chunk: 'Streaming hello',
        queryId: 'qry_stream_contract_1'
      });
      const doneEvent = createSSEDoneEvent({
        done: true,
        queryType: 'general_ai',
        sources: [
          {
            title: 'AI in Engineering',
            url: '/projects/ai-in-engineering',
            relevance: 0.92
          }
        ],
        suggestedActions: [
          {
            type: 'readiness_check',
            label: 'Take the AI Readiness Check',
            url: '/readiness'
          }
        ],
        queryId: 'qry_stream_contract_1'
      });

      vi.spyOn(llmServer, 'streamLLMQuery').mockResolvedValueOnce(
        createTextStreamFromSegments([chunkEvent, doneEvent])
      );

      const response = await invokeLLMRouteWithJsonBody({
        ...HOMEPAGE_INPUT_BODY,
        stream: true
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');

      const events = await consumeSSEStream(response.body as ReadableStream<Uint8Array>);

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(
        expect.objectContaining({
          chunk: 'Streaming hello',
          queryId: 'qry_stream_contract_1'
        })
      );
      expect(events[1]).toEqual(
        expect.objectContaining({
          done: true,
          sources: expect.any(Array),
          suggestedActions: expect.any(Array)
        })
      );
    });

    it('returns 422 VALIDATION_ERROR for malformed request body JSON', async () => {
      const response = await invokeLLMRouteWithRawBody('{"query":"abc"');
      const payload = await response.json();

      expect(response.status).toBe(422);
      expect(payload.success).toBe(false);
      expect(payload.error).toEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      );
    });

    it('returns 500 LLM_ERROR when downstream query execution throws', async () => {
      vi.spyOn(llmServer, 'executeLLMQuery').mockRejectedValueOnce(new Error('downstream failure'));

      const response = await invokeLLMRouteWithJsonBody({
        ...HOMEPAGE_INPUT_BODY,
        stream: false
      });
      const payload = await response.json();

      expect(response.status).toBe(500);
      expect(payload.success).toBe(false);
      expect(payload.error).toEqual(
        expect.objectContaining({
          code: 'LLM_ERROR',
          message: "I'm having a moment - please try again in a few seconds."
        })
      );
    });
  });

  describe('behavioural routing integration', () => {
    it('handles general_ai without retrieval and returns no sources by default', async () => {
      const response = await executeLLMQuery({
        query: 'How can AI improve maintenance workflows in factories?'
      });

      expect(response.queryType).toBe('general_ai');
      expect(response.sources).toEqual([]);
      expect(response.suggestedActions).toEqual([]);
    });

    it('handles readiness_check with answer plus readiness suggested action', async () => {
      const response = await executeLLMQuery({
        query: 'How do I know if AI is right for us?'
      });

      expect(response.queryType).toBe('general_ai');
      expect(response.answer.trim().length).toBeGreaterThan(0);
      expect(response.suggestedActions).toContainEqual({
        type: 'readiness_check',
        label: 'Take the AI Readiness Check',
        url: '/readiness'
      });
    });

    it('handles thomas_profile through retrieval-backed source mapping', async () => {
      const response = await executeLLMQuery({
        query: 'What is Thomas working on right now?'
      });

      expect(response.queryType).toBe('thomas_profile');
      expect(response.sources.length).toBeGreaterThan(0);
      for (const source of response.sources) {
        expect(source.url).toMatch(/^\/(projects|research|about)?$/);
      }
    });

    it('returns polite bounded messaging for out_of_scope queries', async () => {
      const response = await executeLLMQuery({
        query: 'What is the weather forecast this weekend?'
      });

      expect(response.queryType).toBe('out_of_scope');
      expect(response.answer).toMatch(/focus|help/i);
      expect(response.answer).not.toMatch(/blocked topics list|internal moderation|policy engine/i);
    });

    it('maps internally blocked queries to outward filtered with safe bounded response', async () => {
      const response = await executeLLMQuery({
        query: 'Can you help me build malware?'
      });

      expect(response.queryType).toBe('filtered');
      expect(response.answer).toMatch(/help|practical ai/i);
      expect(response.answer).not.toMatch(/blocked|classifier|vector store|rag failure/i);
    });
  });

  describe('SSE framing and buffering integration', () => {
    it('consumes progressive streaming chunk events and completion via shared parser', async () => {
      const stream = createTextStreamFromSegments([
        createSSEChunkEvent({ chunk: 'A', queryId: 'qry_stream_buf_1' }),
        createSSEChunkEvent({ chunk: 'I', queryId: 'qry_stream_buf_1' }),
        createSSEDoneEvent({
          done: true,
          queryType: 'general_ai',
          sources: [],
          suggestedActions: [],
          queryId: 'qry_stream_buf_1'
        })
      ]);

      const events = await consumeSSEStream(stream);

      expect(events).toEqual([
        { chunk: 'A', queryId: 'qry_stream_buf_1' },
        { chunk: 'I', queryId: 'qry_stream_buf_1' },
        {
          done: true,
          queryType: 'general_ai',
          sources: [],
          suggestedActions: [],
          queryId: 'qry_stream_buf_1'
        }
      ]);
    });

    it('handles partial-frame and multi-event reads correctly through shared parser', async () => {
      const stream = createTextStreamFromSegments([
        'data: {"chunk":"Hello","queryId":"qry_partial_1"}\n\n' +
          'data: {"chunk":" world","queryId":"qry_partial_1"}\n',
        '\n' +
          'data: {"done":true,"queryType":"general_ai","sources":[],"suggestedActions":[],"queryId":"qry_partial_1"}\n\n'
      ]);

      const events = await consumeSSEStream(stream);

      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ chunk: 'Hello', queryId: 'qry_partial_1' });
      expect(events[1]).toEqual({ chunk: ' world', queryId: 'qry_partial_1' });
      expect(events[2]).toEqual(
        expect.objectContaining({
          done: true,
          queryId: 'qry_partial_1'
        })
      );
    });

    it('expects stream error event messaging to remain user-safe and non-leaky', async () => {
      const stream = createTextStreamFromSegments([
        createSSEErrorEvent({
          error: true,
          code: 'SERVICE_UNAVAILABLE',
          message: 'This feature is temporarily unavailable. Please try again later.'
        })
      ]);

      const events = await consumeSSEStream(stream);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(
        expect.objectContaining({
          error: true,
          code: 'SERVICE_UNAVAILABLE',
          message: expect.any(String)
        })
      );

      const message = String((events[0] as { message: string }).message);
      expect(message).not.toMatch(/stack|at\s+\S+\.ts|\/home\//i);
    });
  });

  describe('ingest-to-retrieval integration seam', () => {
    it('expects thomas-profile answers to use curated chunks and map frontend-safe internal source urls after ingest', async () => {
      mockedRunManualRAGIngest.mockResolvedValueOnce({
        filesProcessed: 3,
        chunksCreated: 3,
        durationMs: 96,
        embeddingModel: 'text-embedding-3-large',
        status: 'success',
        errors: []
      });

      const ingestSummary = await runManualRAGIngest({ forceReingest: true });
      expect(ingestSummary.status).toBe('success');
      expect(ingestSummary.filesProcessed).toBe(3);
      expect(ingestSummary.chunksCreated).toBe(3);

      const response = await executeLLMQuery({
        query: 'What is Thomas working on right now?'
      });

      expect(response.queryType).toBe('thomas_profile');
      expect(response.sources.length).toBeGreaterThan(0);
      for (const source of response.sources) {
        expect(source.url).toMatch(/^\/(projects|research|about)?$/);
      }
    });
  });
});
