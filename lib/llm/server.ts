import { classifyLLMQuery } from '@/lib/llm/classifier';
import type { LLMQueryRequest, LLMQueryResponse } from '@/lib/llm/types';

function createQueryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `qry_${crypto.randomUUID()}`;
  }

  return `qry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const READINESS_ACTION = {
  type: 'readiness_check',
  label: 'Take the AI Readiness Check',
  url: '/readiness'
} as const;

export async function executeLLMQuery(request: LLMQueryRequest): Promise<LLMQueryResponse> {
  const normalizedQuery = request.query.trim();
  const category = await classifyLLMQuery(normalizedQuery);
  const queryId = createQueryId();

  switch (category) {
    case 'general_ai':
      return {
        answer:
          'A practical place to start is one clear workflow, a measurable outcome, and a short pilot using data you already have before scaling further.',
        queryType: 'general_ai',
        sources: [],
        suggestedActions: [],
        queryId
      };
    case 'thomas_profile':
      return {
        answer:
          'Thomas focuses on applied AI, automation, and industrial systems, with practical work centered on turning operational problems into measurable improvements.',
        queryType: 'thomas_profile',
        sources: [],
        suggestedActions: [],
        queryId
      };
    case 'readiness_check':
      return {
        answer:
          'A strong next step is to map one high-impact process, check data quality, and define what success looks like so you can assess readiness with confidence.',
        queryType: 'general_ai',
        sources: [],
        suggestedActions: [READINESS_ACTION],
        queryId
      };
    case 'out_of_scope':
      return {
        answer:
          "I'm focused on practical AI, automation, and Thomas's work here. If you want, I can help with questions in that area.",
        queryType: 'out_of_scope',
        sources: [],
        suggestedActions: [],
        queryId
      };
    case 'blocked':
      return {
        answer:
          "I can't help with that, but I can help with practical AI for engineering and business use cases.",
        queryType: 'filtered',
        sources: [],
        suggestedActions: [],
        queryId
      };
    default:
      return {
        answer:
          "I'm focused on practical AI, automation, and Thomas's work here. If you want, I can help with questions in that area.",
        queryType: 'out_of_scope',
        sources: [],
        suggestedActions: [],
        queryId
      };
  }
}
