export type LLMQuerySource = 'homepage_chip' | 'homepage_input' | 'llm_page' | 'readiness_check';

export type LLMQueryType = 'thomas_profile' | 'general_ai' | 'out_of_scope' | 'filtered';

export interface LLMSuggestedAction {
  type: 'readiness_check' | 'contact' | 'page_link';
  label: string;
  url: string;
}

export interface LLMSourceLink {
  title: string;
  url: string;
  relevance: number;
}

export interface LLMQueryRequest {
  query: string;
  stream?: boolean;
  sessionId?: string;
  context?: {
    source?: LLMQuerySource;
  };
}

export interface LLMQueryResponse {
  answer: string;
  queryType: LLMQueryType;
  sources: LLMSourceLink[];
  suggestedActions: LLMSuggestedAction[];
  queryId: string;
}

export interface LLMChunkEvent {
  chunk: string;
  queryId: string;
}

export interface LLMDoneEvent {
  done: true;
  queryType: LLMQueryType;
  sources: LLMSourceLink[];
  suggestedActions: LLMSuggestedAction[];
  queryId: string;
}

export interface LLMErrorEvent {
  error: true;
  code: string;
  message: string;
}

export type LLMStreamEvent = LLMChunkEvent | LLMDoneEvent | LLMErrorEvent;
