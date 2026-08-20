/** T3-S2 / T7-S3 — optional OpenTelemetry bootstrap (OTEL_ENABLED=true) */
export function initOpenTelemetry(): void {
  if (process.env.OTEL_ENABLED !== 'true') return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

    const endpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
    const serviceName = process.env.OTEL_SERVICE_NAME || 'wereal-api';

    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({ url: endpoint }),
      instrumentations: [getNodeAutoInstrumentations()],
      serviceName,
    });

    sdk.start();
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'OpenTelemetry enabled',
        serviceName,
        endpoint,
        tier: 'T7-S3',
      }),
    );
    process.on('SIGTERM', () => {
      void sdk.shutdown();
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('OpenTelemetry init skipped:', err instanceof Error ? err.message : err);
  }
}
