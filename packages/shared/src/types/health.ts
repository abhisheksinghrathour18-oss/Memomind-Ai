export interface DatabaseHealth {
  connected: boolean;
  pgvector: boolean;
  version?: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  database: DatabaseHealth;
}
