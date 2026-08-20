/** WEREAL REOS API — bootstrap. OpenAPI base: /api/v1 */
import { NestFactory } from '@nestjs/core';
import { initOpenTelemetry } from './infrastructure/telemetry/otel.bootstrap';
import { ProductionHttpExceptionFilter } from './infrastructure/security/production-http-exception.filter';
import { AppModule } from './app.module';

initOpenTelemetry();

function parseCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  if (!raw || raw === '*') {
    return ['https://app.wereal.vn', 'https://staging.wereal.vn'];
  }
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: process.env.JSON_LOGS === 'true',
  });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  app.useGlobalFilters(new ProductionHttpExceptionFilter());

  if (process.env.TRUST_PROXY === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.enableCors({
    origin: parseCorsOrigins(),
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level: 'info', msg: 'shutdown', signal }));
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'WEREAL API listening',
      url: `http://localhost:${port}/api/v1`,
    }),
  );
}

bootstrap();
