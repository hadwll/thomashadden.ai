import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

const HEALTH_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_LLM_DEPLOYMENT',
  'AZURE_CLASSIFIER_DEPLOYMENT',
  'AZURE_EMBEDDING_DEPLOYMENT',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'CONTACT_NOTIFICATION_EMAIL'
] as const;

const HEALTHY_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.test.example',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-test-value',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-value',
  AZURE_OPENAI_ENDPOINT: 'https://azure-openai.test.example',
  AZURE_OPENAI_API_KEY: 'azure-openai-api-key-test-value',
  AZURE_LLM_DEPLOYMENT: 'gpt-4-5',
  AZURE_CLASSIFIER_DEPLOYMENT: 'gpt-4-5-mini',
  AZURE_EMBEDDING_DEPLOYMENT: 'text-embedding-3-large',
  SMTP_HOST: 'smtp.resend.com',
  SMTP_PORT: '465',
  SMTP_USER: 'resend',
  SMTP_PASS: 'resend-api-key-test-value',
  EMAIL_FROM: 'noreply@thomashadden.ai',
  CONTACT_NOTIFICATION_EMAIL: 'thomas@ia-2.com'
} as const;

type HealthPayload = {
  success?: boolean;
  data?: {
    status?: unknown;
    serviceStatus?: unknown;
  };
  error?: {
    code?: unknown;
    message?: unknown;
    details?: {
      status?: unknown;
      missing?: unknown;
      serviceStatus?: unknown;
    };
  };
  meta?: {
    requestId?: unknown;
    timestamp?: unknown;
  };
};

let originalHealthEnv: Partial<Record<(typeof HEALTH_ENV_KEYS)[number], string | undefined>> = {};

function restoreHealthEnv() {
  for (const key of HEALTH_ENV_KEYS) {
    const value = originalHealthEnv[key];

    if (typeof value === 'string') {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
}

function setHealthEnv(overrides: Partial<Record<(typeof HEALTH_ENV_KEYS)[number], string>>) {
  for (const key of HEALTH_ENV_KEYS) {
    const value = overrides[key];

    if (typeof value === 'string') {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
}

async function invokeHealth() {
  const response = await GET();
  const payload = (await response.json()) as HealthPayload;

  return { response, payload };
}

function expectMeta(meta: HealthPayload['meta']) {
  expect(meta).toBeTruthy();
  expect(typeof meta?.requestId).toBe('string');
  expect(typeof meta?.timestamp).toBe('string');
}

function expectStableServiceStatusShape(serviceStatus: unknown) {
  expect(serviceStatus).toEqual(
    expect.objectContaining({
      app: expect.any(Object),
      supabase: expect.any(Object),
      azureOpenAi: expect.any(Object),
      resend: expect.any(Object)
    })
  );
}

function expectPayloadHidesRawValues(payload: unknown) {
  const serialized = JSON.stringify(payload);

  const sensitiveValues = [
    HEALTHY_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    HEALTHY_ENV.SUPABASE_SERVICE_ROLE_KEY,
    HEALTHY_ENV.AZURE_OPENAI_API_KEY,
    HEALTHY_ENV.SMTP_PASS
  ];

  for (const value of sensitiveValues) {
    expect(serialized).not.toContain(value);
  }
}

describe('GET /api/health contract', () => {
  beforeEach(() => {
    originalHealthEnv = {};

    for (const key of HEALTH_ENV_KEYS) {
      originalHealthEnv[key] = process.env[key];
    }

    setHealthEnv(HEALTHY_ENV);
  });

  afterEach(() => {
    restoreHealthEnv();
  });

  it('returns the launch-readiness success envelope when launch-critical config is present', async () => {
    const { response, payload } = await invokeHealth();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      status: 'ok'
    });

    expectStableServiceStatusShape(payload.data?.serviceStatus);
    expect(payload.data?.serviceStatus).toMatchObject({
      app: {
        status: 'ok'
      },
      supabase: {
        status: 'configured'
      },
      azureOpenAi: {
        status: 'configured'
      },
      resend: {
        status: 'configured'
      }
    });
    expectMeta(payload.meta);
    expectPayloadHidesRawValues(payload);
  });

  it('returns a degraded 503 envelope when required config is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { response, payload } = await invokeHealth();

    expect(response.status).toBe(503);
    expect(payload.success).toBe(false);
    expect(payload.error).toMatchObject({
      code: 'SERVICE_UNAVAILABLE'
    });
    expect(typeof payload.error?.message).toBe('string');
    expect(String(payload.error?.message)).toMatch(/health|readiness|deploy/i);

    expect(payload.error?.details).toMatchObject({
      status: 'degraded'
    });
    expect(Array.isArray(payload.error?.details?.missing)).toBe(true);
    expect(payload.error?.details?.missing).toEqual(
      expect.arrayContaining([
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
      ])
    );
    expectStableServiceStatusShape(payload.error?.details?.serviceStatus);
    expect(payload.error?.details?.serviceStatus).toMatchObject({
      supabase: {
        status: 'missing'
      }
    });
    expectMeta(payload.meta);
    expectPayloadHidesRawValues(payload);
  });

  it('keeps the public payload free of raw env contents while preserving the service wiring shape', async () => {
    const { payload } = await invokeHealth();

    expectPayloadHidesRawValues(payload);
    expectStableServiceStatusShape(payload.data?.serviceStatus);
    expect(Object.keys((payload.data?.serviceStatus as Record<string, unknown>) ?? {})).toEqual(
      expect.arrayContaining(['app', 'supabase', 'azureOpenAi', 'resend'])
    );
  });
});
