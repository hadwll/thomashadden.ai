import { describe, expect, it } from 'vitest';
import {
  consumeSSEStream,
  createSSEChunkEvent,
  createSSEDoneEvent,
  createSSEErrorEvent,
  formatSSEDataEvent
} from '@/lib/llm/sse';

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

function parseSingleDataEventBlock(serialized: string) {
  expect(serialized.startsWith('data: ')).toBe(true);
  expect(serialized.endsWith('\n\n')).toBe(true);
  expect(serialized).not.toContain('\nevent:');
  expect(serialized).not.toContain('\nid:');
  expect(serialized).not.toContain('\nretry:');

  const blocks = serialized.split('\n\n');
  expect(blocks).toHaveLength(2);
  expect(blocks[1]).toBe('');

  const line = blocks[0];
  expect(line.startsWith('data: ')).toBe(true);

  return JSON.parse(line.slice('data: '.length));
}

describe('formatSSEDataEvent', () => {
  it('emits exactly one data block with valid round-trippable JSON and no event metadata fields', () => {
    const payload = {
      chunk: 'AI can help',
      queryId: 'qry_abc123'
    };

    const serialized = formatSSEDataEvent(payload);
    const parsed = parseSingleDataEventBlock(serialized);

    expect(parsed).toEqual(payload);
  });
});

describe('SSE event creators', () => {
  it('createSSEChunkEvent emits the expected { chunk, queryId } shape in one data block', () => {
    const event = {
      chunk: 'engineering workflows',
      queryId: 'qry_chunk_1'
    };

    const serialized = createSSEChunkEvent(event);
    const parsed = parseSingleDataEventBlock(serialized);

    expect(parsed).toEqual(event);
  });

  it('createSSEDoneEvent emits the expected completion payload shape in one data block', () => {
    const event = {
      done: true as const,
      queryType: 'general_ai' as const,
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
      queryId: 'qry_done_1'
    };

    const serialized = createSSEDoneEvent(event);
    const parsed = parseSingleDataEventBlock(serialized);

    expect(parsed).toEqual(event);
  });

  it('createSSEErrorEvent emits the expected { error: true, code, message } shape in one data block', () => {
    const event = {
      error: true as const,
      code: 'SERVICE_UNAVAILABLE',
      message: 'This feature is temporarily unavailable.'
    };

    const serialized = createSSEErrorEvent(event);
    const parsed = parseSingleDataEventBlock(serialized);

    expect(parsed).toEqual(event);
  });
});

describe('consumeSSEStream', () => {
  it('parses one complete chunk event delivered in a single read', async () => {
    const stream = createReadableStreamFromTextChunks([
      'data: {"chunk":"AI can help","queryId":"qry_1"}\n\n'
    ]);

    const events = await consumeSSEStream(stream);

    expect(events).toEqual([
      {
        chunk: 'AI can help',
        queryId: 'qry_1'
      }
    ]);
  });

  it('buffers a split event across reads and parses only once the event is complete', async () => {
    const stream = createReadableStreamFromTextChunks([
      'data: {"chunk":"AI c',
      'an help","queryId":"qry_2"}\n\n'
    ]);

    const events = await consumeSSEStream(stream);

    expect(events).toEqual([
      {
        chunk: 'AI can help',
        queryId: 'qry_2'
      }
    ]);
  });

  it('parses multiple complete data events delivered in a single read', async () => {
    const stream = createReadableStreamFromTextChunks([
      'data: {"chunk":"AI can","queryId":"qry_3"}\n\n' +
        'data: {"chunk":" help","queryId":"qry_3"}\n\n' +
        'data: {"done":true,"queryType":"general_ai","sources":[],"suggestedActions":[],"queryId":"qry_3"}\n\n'
    ]);

    const events = await consumeSSEStream(stream);

    expect(events).toEqual([
      {
        chunk: 'AI can',
        queryId: 'qry_3'
      },
      {
        chunk: ' help',
        queryId: 'qry_3'
      },
      {
        done: true,
        queryType: 'general_ai',
        sources: [],
        suggestedActions: [],
        queryId: 'qry_3'
      }
    ]);
  });

  it('ignores blank lines between events', async () => {
    const stream = createReadableStreamFromTextChunks([
      'data: {"chunk":"one","queryId":"qry_4"}\n\n\n\n' +
        'data: {"chunk":"two","queryId":"qry_4"}\n\n'
    ]);

    const events = await consumeSSEStream(stream);

    expect(events).toEqual([
      {
        chunk: 'one',
        queryId: 'qry_4'
      },
      {
        chunk: 'two',
        queryId: 'qry_4'
      }
    ]);
  });

  it('ignores lines that do not begin with data:', async () => {
    const stream = createReadableStreamFromTextChunks([
      'event: message\n\n' +
        ': keep-alive\n\n' +
        'id: 1\n\n' +
        'data: {"chunk":"accepted","queryId":"qry_5"}\n\n'
    ]);

    const events = await consumeSSEStream(stream);

    expect(events).toEqual([
      {
        chunk: 'accepted',
        queryId: 'qry_5'
      }
    ]);
  });

  it('returns events in the order they were received', async () => {
    const stream = createReadableStreamFromTextChunks([
      'data: {"chunk":"first","queryId":"qry_6"}\n\n' +
        'data: {"chunk":"second","queryId":"qry_6"}\n\n' +
        'data: {"error":true,"code":"SERVICE_UNAVAILABLE","message":"try later"}\n\n'
    ]);

    const events = await consumeSSEStream(stream);

    expect(events).toEqual([
      {
        chunk: 'first',
        queryId: 'qry_6'
      },
      {
        chunk: 'second',
        queryId: 'qry_6'
      },
      {
        error: true,
        code: 'SERVICE_UNAVAILABLE',
        message: 'try later'
      }
    ]);
  });

  it('throws when a data line contains invalid JSON', async () => {
    const stream = createReadableStreamFromTextChunks(['data: {"chunk":}\n\n']);

    await expect(consumeSSEStream(stream)).rejects.toThrow();
  });

  it('throws when the stream closes with an incomplete data event buffered', async () => {
    const stream = createReadableStreamFromTextChunks(['data: {"chunk":"partial","queryId":"qry_7"}\n']);

    await expect(consumeSSEStream(stream)).rejects.toThrow();
  });
});
