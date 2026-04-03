import type {
  LLMChunkEvent,
  LLMDoneEvent,
  LLMErrorEvent,
  LLMQueryRequest,
  LLMQuerySource,
  LLMQueryType,
  LLMStreamEvent
} from '@/lib/llm/types';

export function validateLLMQuery(_query: string): { ok: true } | { ok: false; reason: string } {
  throw new Error('Not implemented');
}

export function buildLLMQueryRequest(_input: {
  query: string;
  sessionId: string;
  source: LLMQuerySource;
  stream?: boolean;
}): LLMQueryRequest {
  throw new Error('Not implemented');
}

export function isLLMQuerySource(_value: string): _value is LLMQuerySource {
  throw new Error('Not implemented');
}

export function isLLMQueryType(_value: string): _value is LLMQueryType {
  throw new Error('Not implemented');
}

export function isLLMChunkEvent(_value: unknown): _value is LLMChunkEvent {
  throw new Error('Not implemented');
}

export function isLLMDoneEvent(_value: unknown): _value is LLMDoneEvent {
  throw new Error('Not implemented');
}

export function isLLMErrorEvent(_value: unknown): _value is LLMErrorEvent {
  throw new Error('Not implemented');
}

export function isLLMStreamEvent(_value: unknown): _value is LLMStreamEvent {
  throw new Error('Not implemented');
}
