import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseEntities } from './database.entities';
import { DatabaseSeedService } from './database.seed.service';
import { TenantRlsService } from './tenant-rls.service';
import { createTypeOrmOptions } from './typeorm-options';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.example'] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createTypeOrmOptions(config),
    }),
    TypeOrmModule.forFeature(databaseEntities),
  ],
  providers: [DatabaseSeedService, TenantRlsService],
  exports: [TypeOrmModule, TenantRlsService],
})
export class DatabaseModule {}
