import { classifyLLMQuery } from '@/lib/llm/classifier';
import { createSSEChunkEvent, createSSEDoneEvent } from '@/lib/llm/sse';
import type { LLMQueryRequest, LLMQueryResponse } from '@/lib/llm/types';
import { assembleRAGContext, mapRAGSources } from '@/lib/rag/context-assembly';
import { retrieveRelevantRAGChunks } from '@/lib/rag/retrieval';

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

const MAX_THOMAS_ANSWER_LENGTH = 600;

function boundedAnswer(answer: string): string {
  const trimmed = answer.trim();
  if (trimmed.length <= MAX_THOMAS_ANSWER_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_THOMAS_ANSWER_LENGTH - 1).trimEnd()}…`;
}

function buildThomasProfileAnswer(input: {
  contextBlock: string;
  sourceCount: number;
  topSection: string | null;
}): string {
  if (input.contextBlock.trim().length === 0 || input.sourceCount === 0) {
    return boundedAnswer(
      "Thomas is focused on applied AI, automation, and measurable industrial outcomes. For specific examples, the Projects and Research pages are the best next places to explore."
    );
  }

  const sectionPhrase = input.topSection?.trim().length
    ? `, with recent emphasis on ${input.topSection?.trim().toLowerCase()},`
    : '';

  return boundedAnswer(
    `Thomas is currently focused on practical AI delivery for engineering and operations${sectionPhrase} combining implementation work with research into measurable business impact. The linked sources below highlight the most relevant current context.`
  );
}

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
      try {
        const retrievedChunks = await retrieveRelevantRAGChunks({
          query: normalizedQuery
        });
        const ragContext = assembleRAGContext(retrievedChunks);
        const sources = mapRAGSources(retrievedChunks);

        return {
          answer: buildThomasProfileAnswer({
            contextBlock: ragContext,
            sourceCount: sources.length,
            topSection: retrievedChunks[0]?.sectionHeading ?? null
          }),
          queryType: 'thomas_profile',
          sources,
          suggestedActions: [],
          queryId
        };
      } catch {
        return {
          answer: boundedAnswer(
            "Thomas is focused on applied AI, automation, and measurable industrial outcomes. For specific examples, the Projects and Research pages are the best next places to explore."
          ),
          queryType: 'thomas_profile',
          sources: [],
          suggestedActions: [],
          queryId
        };
      }
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

export async function streamLLMQuery(request: LLMQueryRequest): Promise<ReadableStream<Uint8Array>> {
  const normalizedQuery = request.query.trim();
  const queryId = 'qry_stream_stub';
  const encoder = new TextEncoder();

  const chunkEvent = createSSEChunkEvent({
    chunk: `Streaming response placeholder for: ${normalizedQuery}`,
    queryId
  });

  const doneEvent = createSSEDoneEvent({
    done: true,
    queryType: 'general_ai',
    sources: [],
    suggestedActions: [],
    queryId
  });

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(chunkEvent));
      controller.enqueue(encoder.encode(doneEvent));
      controller.close();
    }
  });
}
