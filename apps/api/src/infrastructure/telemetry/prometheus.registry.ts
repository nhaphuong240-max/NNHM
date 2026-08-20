import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const promRegistry = new Registry();
collectDefaultMetrics({ register: promRegistry });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [promRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [promRegistry],
});

export async function metricsPayload(): Promise<string> {
  return promRegistry.metrics();
}
