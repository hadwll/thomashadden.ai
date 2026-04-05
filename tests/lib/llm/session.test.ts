import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateLLMSession } from '@/lib/llm/session';

const SESSION_STORAGE_KEY = 'llm_session_id';

describe('getOrCreateLLMSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns an existing llm_session_id from sessionStorage without generating a new one', () => {
    const existingSessionId = 'session-existing';
    const randomUUIDSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('session-generated');

    sessionStorage.setItem(SESSION_STORAGE_KEY, existingSessionId);

    expect(getOrCreateLLMSession()).toBe(existingSessionId);
    expect(randomUUIDSpy).not.toHaveBeenCalled();
  });

  it('creates a UUID with crypto.randomUUID() when no session exists', () => {
    const randomUUIDSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('session-generated');

    expect(getOrCreateLLMSession()).toBe('session-generated');
    expect(randomUUIDSpy).toHaveBeenCalledTimes(1);
  });

  it('writes the generated value to sessionStorage under the exact key llm_session_id', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('session-generated');

    getOrCreateLLMSession();

    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe('session-generated');
  });

  it('returns the stored value after creation', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('session-generated');

    const returnedSessionId = getOrCreateLLMSession();

    expect(returnedSessionId).toBe(sessionStorage.getItem(SESSION_STORAGE_KEY));
  });

  it('does not overwrite a valid existing session id on repeated calls in the same tab/session', () => {
    const randomUUIDSpy = vi
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('session-first')
      .mockReturnValueOnce('session-second');

    const firstCallResult = getOrCreateLLMSession();
    const secondCallResult = getOrCreateLLMSession();

    expect(firstCallResult).toBe('session-first');
    expect(secondCallResult).toBe('session-first');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe('session-first');
    expect(randomUUIDSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to a UUID-shaped session id when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues(bytes: Uint8Array) {
        bytes.fill(2);
        return bytes;
      }
    } as Crypto);

    const sessionId = getOrCreateLLMSession();

    expect(sessionId).toBe('02020202-0202-4202-8202-020202020202');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(sessionId);
  });
});
