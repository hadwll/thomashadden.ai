import type { LLMChunkEvent, LLMDoneEvent, LLMErrorEvent, LLMStreamEvent } from '@/lib/llm/types';

export function formatSSEDataEvent(_payload: object): string {
  throw new Error('Not implemented');
}

export function createSSEChunkEvent(_input: LLMChunkEvent): string {
  throw new Error('Not implemented');
}

export function createSSEDoneEvent(_input: LLMDoneEvent): string {
  throw new Error('Not implemented');
}

export function createSSEErrorEvent(_input: LLMErrorEvent): string {
  throw new Error('Not implemented');
}

export async function consumeSSEStream(_stream: ReadableStream<Uint8Array>): Promise<LLMStreamEvent[]> {
  throw new Error('Not implemented');
}
