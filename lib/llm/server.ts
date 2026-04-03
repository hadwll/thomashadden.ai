import type { LLMQueryRequest, LLMQueryResponse } from '@/lib/llm/types';

export async function executeLLMQuery(_request: LLMQueryRequest): Promise<LLMQueryResponse> {
  throw new Error('Not implemented');
}
