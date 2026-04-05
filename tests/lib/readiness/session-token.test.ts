import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearReadinessSessionStorage, generateReadinessSessionToken } from '@/lib/readiness/session-token';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('generateReadinessSessionToken', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    clearReadinessSessionStorage();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns a UUID from crypto.randomUUID when it is available', () => {
    const randomUUIDSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');

    expect(generateReadinessSessionToken()).toBe('11111111-1111-4111-8111-111111111111');
    expect(randomUUIDSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to a UUID-shaped token when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues(bytes: Uint8Array) {
        bytes.fill(1);
        return bytes;
      }
    } as Crypto);

    const token = generateReadinessSessionToken();

    expect(token).toMatch(UUID_REGEX);
    expect(token).toBe('01010101-0101-4101-8101-010101010101');
  });
});
