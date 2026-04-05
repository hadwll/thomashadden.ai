const READINESS_SESSION_TOKEN_KEY = 'readiness_session_token';
const READINESS_SESSION_STARTED_KEY = 'readiness_session_started';

export type ReadinessSessionStorageState = {
  sessionToken: string | null;
  sessionStarted: string | null;
};

function canAccessLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function generateFallbackSessionToken(): string {
  const bytes = new Uint8Array(16);
  const webCrypto = globalThis.crypto;

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateReadinessSessionToken(): string {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : generateFallbackSessionToken();
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
