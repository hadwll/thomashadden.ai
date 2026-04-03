import type { LLMChunkEvent, LLMDoneEvent, LLMErrorEvent, LLMStreamEvent } from '@/lib/llm/types';

export function formatSSEDataEvent(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function createSSEChunkEvent(input: LLMChunkEvent): string {
  return formatSSEDataEvent(input);
}

export function createSSEDoneEvent(input: LLMDoneEvent): string {
  return formatSSEDataEvent(input);
}

export function createSSEErrorEvent(input: LLMErrorEvent): string {
  return formatSSEDataEvent(input);
}

export async function consumeSSEStream(stream: ReadableStream<Uint8Array>): Promise<LLMStreamEvent[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: LLMStreamEvent[] = [];

  let buffer = '';

  const parseEventBlock = (eventBlock: string) => {
    if (eventBlock.trim().length === 0) {
      return;
    }

    const lines = eventBlock.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data:')) {
        continue;
      }

      const jsonPayload = line.startsWith('data: ') ? line.slice(6) : line.slice(5).trimStart();
      const parsedPayload = JSON.parse(jsonPayload) as LLMStreamEvent;
      events.push(parsedPayload);
    }
  };

  const drainCompleteEvents = () => {
    while (true) {
      const separatorIndex = buffer.indexOf('\n\n');
      if (separatorIndex === -1) {
        return;
      }

      const nextEventBlock = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      parseEventBlock(nextEventBlock);
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      drainCompleteEvents();
    }

    buffer += decoder.decode();
    drainCompleteEvents();
  } finally {
    reader.releaseLock();
  }

  if (buffer.length > 0) {
    throw new Error('SSE stream ended with incomplete buffered event data.');
  }

  return events;
}
