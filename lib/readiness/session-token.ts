const READINESS_SESSION_TOKEN_KEY = 'readiness_session_token';
const READINESS_SESSION_STARTED_KEY = 'readiness_session_started';

export type ReadinessSessionStorageState = {
  sessionToken: string | null;
  sessionStarted: string | null;
};

function canAccessLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function generateReadinessSessionToken(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is unavailable.');
  }

  return randomUUID.call(globalThis.crypto);
}

export function readReadinessSessionStorage(): ReadinessSessionStorageState {
  if (!canAccessLocalStorage()) {
    return {
      sessionToken: null,
      sessionStarted: null
    };
  }

  return {
    sessionToken: window.localStorage.getItem(READINESS_SESSION_TOKEN_KEY),
    sessionStarted: window.localStorage.getItem(READINESS_SESSION_STARTED_KEY)
  };
}

export function writeReadinessSessionStorage(
  sessionToken: string,
  sessionStarted = new Date().toISOString()
): void {
  if (!canAccessLocalStorage()) {
    return;
  }

  window.localStorage.setItem(READINESS_SESSION_TOKEN_KEY, sessionToken);
  window.localStorage.setItem(READINESS_SESSION_STARTED_KEY, sessionStarted);
}

export function clearReadinessSessionStorage(): void {
  if (!canAccessLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(READINESS_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(READINESS_SESSION_STARTED_KEY);
}
