export type LLMClassifierCategory =
  | 'thomas_profile'
  | 'general_ai'
  | 'readiness_check'
  | 'out_of_scope'
  | 'blocked';

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesAnyPhrase(query: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => query.includes(phrase));
}

const BLOCKED_PHRASES = [
  'build malware',
  'create malware',
  'write malware',
  'make malware',
  'malware',
  'ransomware',
  'keylogger',
  'phishing kit',
  'ddos attack',
  'sql injection',
  'exploit',
  'bypass security'
] as const;

const THOMAS_PROFILE_PHRASES = [
  'thomas',
  'what is thomas working on',
  'who is thomas',
  'park electrical',
  'industrial analytics'
] as const;

const READINESS_PHRASES = [
  'how do i know if ai is right for us',
  'is ai right for us',
  'ai is right for us',
  'where do we start with ai',
  'where do i start with ai',
  'ai readiness',
  'should we adopt ai'
] as const;

const OUT_OF_SCOPE_PHRASES = [
  'tell me a joke',
  'joke',
  'weather',
  'forecast',
  'sports',
  'who won the match',
  'who won the game',
  'score tonight'
] as const;

export async function classifyLLMQuery(query: string): Promise<LLMClassifierCategory> {
  const normalizedQuery = normalizeQuery(query);

  if (matchesAnyPhrase(normalizedQuery, BLOCKED_PHRASES)) {
    return 'blocked';
  }

  if (matchesAnyPhrase(normalizedQuery, THOMAS_PROFILE_PHRASES)) {
    return 'thomas_profile';
  }

  if (matchesAnyPhrase(normalizedQuery, READINESS_PHRASES)) {
    return 'readiness_check';
  }

  if (matchesAnyPhrase(normalizedQuery, OUT_OF_SCOPE_PHRASES)) {
    return 'out_of_scope';
  }

  return 'general_ai';
}
