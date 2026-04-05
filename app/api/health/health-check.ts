export type HealthServiceName = 'app' | 'supabase' | 'azureOpenAi' | 'resend';

export type HealthServiceStatus = 'ok' | 'configured' | 'missing';

export type HealthServiceEntry = {
  status: HealthServiceStatus;
  missing?: string[];
};

export type HealthCheckEnvelope = {
  status: 'ok' | 'degraded';
  missing: string[];
  serviceStatus: Record<HealthServiceName, HealthServiceEntry>;
};

const SUPABASE_CRITICAL_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
const SUPABASE_DIAGNOSTIC_KEYS = ['SUPABASE_SERVICE_ROLE_KEY'] as const;

const AZURE_OPENAI_CRITICAL_KEYS = [
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_LLM_DEPLOYMENT',
  'AZURE_EMBEDDING_DEPLOYMENT'
] as const;

const AZURE_CLASSIFIER_KEYS = ['AZURE_LLM_CLASSIFIER_DEPLOYMENT', 'AZURE_CLASSIFIER_DEPLOYMENT'] as const;

const RESEND_KEYS = ['RESEND_API_KEY'] as const;
const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'CONTACT_NOTIFICATION_EMAIL'] as const;

function readPresentEnvValue(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function collectMissing(keys: readonly string[]): string[] {
  return keys.filter((key) => !readPresentEnvValue(key));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function buildConfiguredEntry(): HealthServiceEntry {
  return {
    status: 'configured'
  };
}

function buildMissingEntry(missing: string[]): HealthServiceEntry {
  return {
    status: 'missing',
    missing
  };
}

function evaluateSupabase(): { configured: boolean; entry: HealthServiceEntry; missing: string[] } {
  const criticalMissing = collectMissing(SUPABASE_CRITICAL_KEYS);
  const configured = criticalMissing.length === 0;

  if (configured) {
    return {
      configured: true,
      entry: buildConfiguredEntry(),
      missing: []
    };
  }

  const missing = unique([...criticalMissing, ...collectMissing(SUPABASE_DIAGNOSTIC_KEYS)]);

  return {
    configured: false,
    entry: buildMissingEntry(missing),
    missing
  };
}

function evaluateAzureOpenAi(): { configured: boolean; entry: HealthServiceEntry; missing: string[] } {
  const criticalMissing = collectMissing(AZURE_OPENAI_CRITICAL_KEYS);
  const hasClassifierDeployment =
    readPresentEnvValue('AZURE_LLM_CLASSIFIER_DEPLOYMENT') || readPresentEnvValue('AZURE_CLASSIFIER_DEPLOYMENT');
  const missingClassifier = hasClassifierDeployment ? [] : [...AZURE_CLASSIFIER_KEYS];

  const missing = unique([...criticalMissing, ...missingClassifier]);
  const configured = missing.length === 0;

  if (configured) {
    return {
      configured: true,
      entry: buildConfiguredEntry(),
      missing: []
    };
  }

  return {
    configured: false,
    entry: buildMissingEntry(missing),
    missing
  };
}

function evaluateResend(): { configured: boolean; entry: HealthServiceEntry; missing: string[] } {
  const hasResendApiKey = readPresentEnvValue('RESEND_API_KEY');
  const hasSmtpConfiguration = SMTP_KEYS.every((key) => readPresentEnvValue(key));
  const configured = hasResendApiKey || hasSmtpConfiguration;

  if (configured) {
    return {
      configured: true,
      entry: buildConfiguredEntry(),
      missing: []
    };
  }

  const missing = unique([...collectMissing(RESEND_KEYS), ...collectMissing(SMTP_KEYS)]);

  return {
    configured: false,
    entry: buildMissingEntry(missing),
    missing
  };
}

function buildServiceStatus() {
  const app: HealthServiceEntry = {
    status: 'ok'
  };

  const supabase = evaluateSupabase();
  const azureOpenAi = evaluateAzureOpenAi();
  const resend = evaluateResend();

  const serviceStatus: Record<HealthServiceName, HealthServiceEntry> = {
    app,
    supabase: supabase.entry,
    azureOpenAi: azureOpenAi.entry,
    resend: resend.entry
  };

  const missing = unique([...supabase.missing, ...azureOpenAi.missing, ...resend.missing]);

  return {
    status: missing.length === 0 ? 'ok' : 'degraded',
    missing,
    serviceStatus
  } satisfies HealthCheckEnvelope;
}

export function createHealthCheckEnvelope(): HealthCheckEnvelope {
  return buildServiceStatus();
}
