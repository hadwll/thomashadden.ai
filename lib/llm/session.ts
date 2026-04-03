export function getOrCreateLLMSession(): string {
  const existingSessionId = sessionStorage.getItem('llm_session_id');

  if (existingSessionId) {
    return existingSessionId;
  }

  const generatedSessionId = crypto.randomUUID();
  sessionStorage.setItem('llm_session_id', generatedSessionId);

  return generatedSessionId;
}
