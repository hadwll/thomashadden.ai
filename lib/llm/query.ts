import type {
  LLMChunkEvent,
  LLMDoneEvent,
  LLMErrorEvent,
  LLMQueryRequest,
  LLMQuerySource,
  LLMSourceLink,
  LLMSuggestedAction,
  LLMQueryType,
  LLMStreamEvent
} from '@/lib/llm/types';

const LLM_QUERY_SOURCES = ['homepage_chip', 'homepage_input', 'llm_page', 'readiness_check'] as const;
const LLM_QUERY_SOURCE_SET = new Set<string>(LLM_QUERY_SOURCES);

const LLM_QUERY_TYPES = ['thomas_profile', 'general_ai', 'out_of_scope', 'filtered'] as const;
const LLM_QUERY_TYPE_SET = new Set<string>(LLM_QUERY_TYPES);

const LLM_SUGGESTED_ACTION_TYPES = ['readiness_check', 'contact', 'page_link'] as const;
const LLM_SUGGESTED_ACTION_TYPE_SET = new Set<string>(LLM_SUGGESTED_ACTION_TYPES);

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 500;

export function validateLLMQuery(query: string): { ok: true } | { ok: false; reason: string } {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    return {
      ok: false,
      reason: 'Query cannot be empty.'
    };
  }

  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    return {
      ok: false,
      reason: `Query must be at least ${MIN_QUERY_LENGTH} characters long.`
    };
  }

  if (trimmedQuery.length > MAX_QUERY_LENGTH) {
    return {
      ok: false,
      reason: `Query must be ${MAX_QUERY_LENGTH} characters or fewer.`
    };
  }

  return { ok: true };
}

export function buildLLMQueryRequest(input: {
  query: string;
  sessionId: string;
  source: LLMQuerySource;
  stream?: boolean;
}): LLMQueryRequest {
  return {
    query: input.query.trim(),
    stream: input.stream ?? false,
    sessionId: input.sessionId,
    context: {
      source: input.source
    }
  };
}

export function isLLMQuerySource(value: string): value is LLMQuerySource {
  return LLM_QUERY_SOURCE_SET.has(value);
}

export function isLLMQueryType(value: string): value is LLMQueryType {
  return LLM_QUERY_TYPE_SET.has(value);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLLMSuggestedAction(value: unknown): value is LLMSuggestedAction {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.type === 'string' &&
    LLM_SUGGESTED_ACTION_TYPE_SET.has(value.type) &&
    typeof value.label === 'string' &&
    typeof value.url === 'string'
  );
}

function isLLMSourceLink(value: unknown): value is LLMSourceLink {
  if (!isObjectRecord(value)) {
    return false;
  }

  return typeof value.title === 'string' && typeof value.url === 'string' && typeof value.relevance === 'number';
}

export function isLLMChunkEvent(value: unknown): value is LLMChunkEvent {
  if (!isObjectRecord(value)) {
    return false;
  }

  return typeof value.chunk === 'string' && typeof value.queryId === 'string';
}

export function isLLMDoneEvent(value: unknown): value is LLMDoneEvent {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.done === true &&
    typeof value.queryType === 'string' &&
    isLLMQueryType(value.queryType) &&
    Array.isArray(value.sources) &&
    value.sources.every(isLLMSourceLink) &&
    Array.isArray(value.suggestedActions) &&
    value.suggestedActions.every(isLLMSuggestedAction) &&
    typeof value.queryId === 'string'
  );
}

export function isLLMErrorEvent(value: unknown): value is LLMErrorEvent {
  if (!isObjectRecord(value)) {
    return false;
  }

  return value.error === true && typeof value.code === 'string' && typeof value.message === 'string';
}

export function isLLMStreamEvent(value: unknown): value is LLMStreamEvent {
  return isLLMChunkEvent(value) || isLLMDoneEvent(value) || isLLMErrorEvent(value);
}
