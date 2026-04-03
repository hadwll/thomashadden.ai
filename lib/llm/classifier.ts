export type LLMClassifierCategory =
  | 'thomas_profile'
  | 'general_ai'
  | 'readiness_check'
  | 'out_of_scope'
  | 'blocked';

export async function classifyLLMQuery(_query: string): Promise<LLMClassifierCategory> {
  throw new Error('Not implemented');
}
