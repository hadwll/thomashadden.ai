import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/llm/query/route';
import * as llmServer from '@/lib/llm/server';
import type { LLMQueryResponse } from '@/lib/llm/types';

vi.mock('@/lib/llm/server', () => ({
  executeLLMQuery: vi.fn(),
  streamLLMQuery: vi.fn()
}));

const VALID_STREAM_REQUEST_BODY = {
  query: 'How can AI help an engineering business?',
  stream: true,
  sessionId: '123e4567-e89b-12d3-a456-426614174000',
  context: {
    source: 'homepage_input'
  }
} as const;

const MOCK_NON_STREAM_RESPONSE: LLMQueryResponse = {
  answer: 'AI can help with automation and operational improvements.',
  queryType: 'general_ai',
  sources: [],
  suggestedActions: [],
  queryId: 'qry_non_stream'
};

const MOCK_STREAM_TEXT =
  'data: {"chunk":"AI can help","queryId":"qry_stream_1"}\n\n' +
  'data: {"done":true,"queryType":"general_ai","sources":[],"suggestedActions":[],"queryId":"qry_stream_1"}\n\n';

const mockedExecuteLLMQuery = vi.mocked(llmServer.executeLLMQuery);
const mockedStreamLLMQuery = vi.mocked(
  (
    llmServer as unknown as {
      streamLLMQuery: (request: unknown) => Promise<ReadableStream<Uint8Array>>;
    }
  ).streamLLMQuery
);

function createReadableStreamFromTextChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    }
  });
}

async function invoke(body: unknown) {
  const request = new NextRequest('http://localhost:3000/api/llm/query', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return POST(request);
}

describe('POST /api/llm/query streaming mode contract', () => {
  beforeEach(() => {
    mockedExecuteLLMQuery.mockReset();
    mockedExecuteLLMQuery.mockResolvedValue(MOCK_NON_STREAM_RESPONSE);

    mockedStreamLLMQuery.mockReset();
    mockedStreamLLMQuery.mockResolvedValue(createReadableStreamFromTextChunks([MOCK_STREAM_TEXT]));
  });

  it('returns HTTP 200 with SSE headers and passthrough body for stream: true', async () => {
    const response = await invoke(VALID_STREAM_REQUEST_BODY);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('cache-control')).toContain('no-cache');
    expect(response.headers.get('connection')).toContain('keep-alive');

    const body = await response.text();
    expect(body).toBe(MOCK_STREAM_TEXT);
  });

  it('routes explicit stream: true to streamLLMQuery and not executeLLMQuery', async () => {
    await invoke(VALID_STREAM_REQUEST_BODY);

    expect(mockedStreamLLMQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: VALID_STREAM_REQUEST_BODY.query,
        stream: true,
        sessionId: VALID_STREAM_REQUEST_BODY.sessionId,
        context: {
          source: 'homepage_input'
        }
      })
    );
    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
  });

  it('does not route to streaming mode when stream is omitted', async () => {
    const { stream, ...bodyWithoutStream } = VALID_STREAM_REQUEST_BODY;

    const response = await invoke(bodyWithoutStream);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    expect(mockedStreamLLMQuery).not.toHaveBeenCalled();
    expect(mockedExecuteLLMQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: VALID_STREAM_REQUEST_BODY.query,
        stream: false,
        sessionId: VALID_STREAM_REQUEST_BODY.sessionId,
        context: {
          source: 'homepage_input'
        }
      })
    );
  });

  it('returns HTTP 422 VALIDATION_ERROR JSON envelope for invalid streaming payload', async () => {
    const response = await invoke({
      ...VALID_STREAM_REQUEST_BODY,
      query: '  '
    });

    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({
      code: 'VALIDATION_ERROR'
    });

    expect(mockedStreamLLMQuery).not.toHaveBeenCalled();
    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 LLM_ERROR JSON envelope when streamLLMQuery throws before returning a stream', async () => {
    mockedStreamLLMQuery.mockRejectedValueOnce(new Error('stream helper failed'));

    const response = await invoke(VALID_STREAM_REQUEST_BODY);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({
      code: 'LLM_ERROR'
    });

    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
  });
});
