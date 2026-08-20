import { join } from 'path';
import type { ConfigService } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import { databaseEntities } from './database.entities';

export function createTypeOrmOptions(config: ConfigService): DataSourceOptions {
  const synchronize =
    config.get<string>('DB_SYNCHRONIZE') === 'true' ||
    (config.get<string>('DB_SYNCHRONIZE') !== 'false' &&
      config.get<string>('NODE_ENV', 'development') !== 'production');

  return {
    type: 'postgres',
    url: config.get<string>(
      'DATABASE_URL',
      'postgresql://wereal:wereal@localhost:5432/wereal',
    ),
    entities: databaseEntities,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsRun: config.get<string>('DB_MIGRATIONS_RUN', 'false') === 'true',
    synchronize,
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
