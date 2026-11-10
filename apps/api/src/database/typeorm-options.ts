import { join } from 'path';
import type { ConfigService } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import { databaseEntities } from './database.entities';
import { isStrictDbEnv, resolveDbSynchronize } from './production-db-config';

const DEV_DATABASE_URL = 'postgresql://wereal:wereal@localhost:5432/wereal';

export function createTypeOrmOptions(config: ConfigService): DataSourceOptions {
  const env = {
    NODE_ENV: config.get<string>('NODE_ENV', 'development'),
    STRICT_PRODUCTION_SECURITY: config.get<string>('STRICT_PRODUCTION_SECURITY'),
    DATABASE_URL: config.get<string>('DATABASE_URL'),
    DB_SYNCHRONIZE: config.get<string>('DB_SYNCHRONIZE'),
  };
  const configuredUrl = env.DATABASE_URL?.trim();
  return {
    type: 'postgres',
    url: configuredUrl || (isStrictDbEnv(env) ? '' : DEV_DATABASE_URL),
    entities: databaseEntities,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsRun: config.get<string>('DB_MIGRATIONS_RUN', 'false') === 'true',
    synchronize: resolveDbSynchronize(env),
    logging: config.get<string>('DB_LOGGING') === 'true',
  };
}

export function createCliDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://wereal:wereal@localhost:5432/wereal',
    entities: databaseEntities,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false,
  };
}
