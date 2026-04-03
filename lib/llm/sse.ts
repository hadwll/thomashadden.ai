import type { LLMChunkEvent, LLMDoneEvent, LLMErrorEvent, LLMStreamEvent } from '@/lib/llm/types';

const DEFAULT_SSE_ERROR_MESSAGE = 'This feature is temporarily unavailable. Please try again later.';

const LEAK_PATTERNS = [
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

function hasLeakPattern(message: string): boolean {
  return LEAK_PATTERNS.some((pattern) => pattern.test(message));
}

function sanitizeSSEErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length === 0 || hasLeakPattern(trimmed)) {
    return DEFAULT_SSE_ERROR_MESSAGE;
  }

  return trimmed;
}

function sanitizeSSEStreamEvent(event: LLMStreamEvent): LLMStreamEvent {
  if ('error' in event && event.error === true) {
    return {
      ...event,
      message: sanitizeSSEErrorMessage(event.message)
    };
  }

  return event;
}

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
  return formatSSEDataEvent({
    ...input,
    message: sanitizeSSEErrorMessage(input.message)
  });
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
      events.push(sanitizeSSEStreamEvent(parsedPayload));
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
