import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateLLMSession } from '@/lib/llm/session';

const SESSION_STORAGE_KEY = 'llm_session_id';

describe('getOrCreateLLMSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
