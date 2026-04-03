import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/dev/rag/ingest/route';
import { runManualRAGIngest, type RAGIngestSummary } from '@/lib/rag/ingest';

vi.mock('@/lib/rag/ingest', () => ({
  runManualRAGIngest: vi.fn()
}));

const mockedRunManualRAGIngest = vi.mocked(runManualRAGIngest);

const SUCCESS_SUMMARY: RAGIngestSummary = {
  filesProcessed: 4,
  chunksCreated: 142,
  durationMs: 4200,
  embeddingModel: 'text-embedding-3-large',
  status: 'success',
  errors: []
};

function expectMeta(meta: unknown) {
  const maybeMeta = meta as { requestId?: unknown; timestamp?: unknown };
  expect(maybeMeta).toBeTruthy();
  expect(typeof maybeMeta.requestId).toBe('string');
  expect(typeof maybeMeta.timestamp).toBe('string');
}

async function invokeJson(body: unknown) {
  const request = new NextRequest('http://localhost:3000/api/dev/rag/ingest', {
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

async function invokeWithoutBody() {
  const request = new NextRequest('http://localhost:3000/api/dev/rag/ingest', {
    method: 'POST'
  });

  const response = await POST(request);
  const payload = await response.json();

  return { response, payload };
}

async function invokeRawBody(rawBody: string) {
  const request = new NextRequest('http://localhost:3000/api/dev/rag/ingest', {
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

describe('POST /api/dev/rag/ingest contract', () => {
  beforeEach(() => {
    mockedRunManualRAGIngest.mockReset();
    mockedRunManualRAGIngest.mockResolvedValue({ ...SUCCESS_SUMMARY });
  });

  it('returns 200 success envelope with ingest summary fields for valid forceReingest body', async () => {
    const { response, payload } = await invokeJson({ forceReingest: true });

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      filesProcessed: expect.any(Number),
      chunksCreated: expect.any(Number),
      durationMs: expect.any(Number),
      embeddingModel: expect.any(String),
      status: expect.any(String),
      errors: expect.any(Array)
    });
    expectMeta(payload.meta);
  });

  it('allows empty POST body and uses the standard manual ingest path', async () => {
    const { response, payload } = await invokeWithoutBody();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockedRunManualRAGIngest).toHaveBeenCalledTimes(1);
  });

  it('returns 422 VALIDATION_ERROR for malformed JSON', async () => {
    const { response, payload } = await invokeRawBody('{"forceReingest": true');

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expectMeta(payload.meta);
  });

  it('returns 422 VALIDATION_ERROR when forceReingest is not a boolean', async () => {
    const { response, payload } = await invokeJson({ forceReingest: 'yes' });

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockedRunManualRAGIngest).not.toHaveBeenCalled();
    expectMeta(payload.meta);
  });

  it('returns 500 RAG_ERROR when the ingest pipeline throws', async () => {
    mockedRunManualRAGIngest.mockRejectedValueOnce(new Error('ingest pipeline failed'));

    const { response, payload } = await invokeJson({ forceReingest: true });

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({ code: 'RAG_ERROR' });
    expectMeta(payload.meta);
  });
});
