import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantConfigVersionEntity } from '../../database/entities/tenant-config-version.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditModule } from '../audit/audit.module';
import { TenantConfigController } from './tenant-config.controller';
import { TenantConfigService } from './tenant-config.service';
import { RailResolverService } from './rail-resolver.service';
import { SimulateRailGuard } from './simulate-rail.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantConfigVersionEntity, AuditEventEntity]),
    AuditModule,
  ],
  controllers: [TenantConfigController],
  providers: [TenantConfigService, RailResolverService, SimulateRailGuard],
  exports: [TenantConfigService, RailResolverService, SimulateRailGuard],
})
export class TenantConfigModule {}
