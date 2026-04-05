export type HealthServiceStatus = 'ok' | 'configured' | 'missing' | 'degraded';

export type HealthServiceEntry = {
  status: HealthServiceStatus;
};

export type HealthCheckEnvelope = {
  status: HealthServiceStatus;
  serviceStatus: Record<string, HealthServiceEntry>;
  missing: string[];
};

export function createHealthCheckEnvelope(): HealthCheckEnvelope {
  return {
    status: 'degraded',
    serviceStatus: {
      app: {
        status: 'degraded'
      }
    },
    missing: []
  };
}
