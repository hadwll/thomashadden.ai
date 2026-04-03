import type { LLMQueryRequest, LLMQueryResponse } from '@/lib/llm/types';

function createQueryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `qry_${crypto.randomUUID()}`;
  }

  return `qry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function executeLLMQuery(request: LLMQueryRequest): Promise<LLMQueryResponse> {
  const normalizedQuery = request.query.trim();

  return {
    answer: `Thanks for your question. The non-streaming LLM route foundation is active and received: "${normalizedQuery}".`,
    queryType: 'general_ai',
    sources: [],
    suggestedActions: [],
    queryId: createQueryId()
  };
}
