import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/llm/query/route';
import { executeLLMQuery } from '@/lib/llm/server';
import type { LLMQueryResponse } from '@/lib/llm/types';

vi.mock('@/lib/llm/server', () => ({
  executeLLMQuery: vi.fn()
}));

const VALID_REQUEST_BODY = {
  query: 'How can AI help an engineering business?',
  sessionId: '123e4567-e89b-12d3-a456-426614174000',
  context: {
    source: 'homepage_input'
  }
} as const;

const MOCK_QUERY_RESPONSE: LLMQueryResponse = {
  answer: 'AI can help with automation, planning, and operational insights.',
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
  queryId: 'qry_abc123'
};

const mockedExecuteLLMQuery = vi.mocked(executeLLMQuery);

async function invoke(body: unknown) {
  const request = new NextRequest('http://localhost:3000/api/llm/query', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const response = await POST(request);
  const payload = await response.json();

  return { response, payload };
}

async function invokeWithRawBody(rawBody: string) {
  const request = new NextRequest('http://localhost:3000/api/llm/query', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: rawBody
  });

  const response = await POST(request);
  const payload = await response.json();

  return { response, payload };
}

function expectMeta(meta: unknown) {
  const maybeMeta = meta as { requestId?: unknown; timestamp?: unknown };
  expect(maybeMeta).toBeTruthy();
  expect(typeof maybeMeta.requestId).toBe('string');
  expect(typeof maybeMeta.timestamp).toBe('string');
}

describe('POST /api/llm/query non-streaming contract', () => {
  beforeEach(() => {
    mockedExecuteLLMQuery.mockReset();
    mockedExecuteLLMQuery.mockResolvedValue(MOCK_QUERY_RESPONSE);
  });

  it('returns success envelope with non-streaming query response data for a valid request body', async () => {
    const { response, payload } = await invoke(VALID_REQUEST_BODY);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.answer).toEqual(expect.any(String));
    expect(payload.data.queryType).toEqual(expect.any(String));
    expect(payload.data.sources).toEqual(expect.any(Array));
    expect(payload.data.suggestedActions).toEqual(expect.any(Array));
    expect(payload.data.queryId).toEqual(expect.any(String));
    expectMeta(payload.meta);
  });

  it('treats omitted stream as non-streaming by passing stream: false to the server helper', async () => {
    const { response, payload } = await invoke(VALID_REQUEST_BODY);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockedExecuteLLMQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: VALID_REQUEST_BODY.query,
        sessionId: VALID_REQUEST_BODY.sessionId,
        stream: false,
        context: {
          source: 'homepage_input'
        }
      })
    );
  });

  it('supports explicit stream: false with the non-streaming response envelope', async () => {
    const { response, payload } = await invoke({
      ...VALID_REQUEST_BODY,
      stream: false
    });

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      answer: expect.any(String),
      queryType: expect.any(String),
      sources: expect.any(Array),
      suggestedActions: expect.any(Array),
      queryId: expect.any(String)
    });
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR for a whitespace-only query', async () => {
    const { response, payload } = await invoke({
      ...VALID_REQUEST_BODY,
      query: '     '
    });

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR for a query longer than 500 characters', async () => {
    const { response, payload } = await invoke({
      ...VALID_REQUEST_BODY,
      query: 'x'.repeat(501)
    });

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR for an invalid sessionId', async () => {
    const { response, payload } = await invoke({
      ...VALID_REQUEST_BODY,
      sessionId: 'not-a-uuid'
    });

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR for an invalid context.source value', async () => {
    const { response, payload } = await invoke({
      ...VALID_REQUEST_BODY,
      context: {
        source: 'invalid_source'
      }
    });

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR for malformed JSON body', async () => {
    const { response, payload } = await invokeWithRawBody('{"query": "abc"');

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockedExecuteLLMQuery).not.toHaveBeenCalled();
    expectMeta(payload.meta);
  });

  it('maps downstream server helper failures to 500 LLM_ERROR', async () => {
    mockedExecuteLLMQuery.mockRejectedValueOnce(new Error('downstream failure'));

    const { response, payload } = await invoke({
      ...VALID_REQUEST_BODY,
      stream: false
    });

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'LLM_ERROR' });
    expectMeta(payload.meta);
  });
});
