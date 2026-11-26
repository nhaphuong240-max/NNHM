/** WEREAL REOS API — bootstrap. OpenAPI base: /api/v1 */
import { NestFactory } from '@nestjs/core';
import { initOpenTelemetry } from './infrastructure/telemetry/otel.bootstrap';
import { ProductionHttpExceptionFilter } from './infrastructure/security/production-http-exception.filter';
import { AppModule } from './app.module';
import { createCorsOrigin } from './common/cors-policy';
import { refuseDefaultTenantAtBoot } from './common/default-tenant-flag';
import { applySecurityHeaders } from './common/security-headers';

refuseDefaultTenantAtBoot();
initOpenTelemetry();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: process.env.JSON_LOGS === 'true',
  });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  app.useGlobalFilters(new ProductionHttpExceptionFilter());

  const server = app.getHttpAdapter().getInstance();
  server.disable('x-powered-by');
  if (process.env.TRUST_PROXY === 'true') {
    server.set('trust proxy', 1);
  }
  server.use(applySecurityHeaders);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) =>
      createCorsOrigin(process.env)(origin, callback),
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const shutdown = async (signal: string) => {
    console.log(JSON.stringify({ level: 'info', msg: 'shutdown', signal }));
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'WEREAL API listening',
      url: `http://localhost:${port}/api/v1`,
    }),
  );
}

bootstrap();
