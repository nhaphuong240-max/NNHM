import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycProfileEntity } from '../../database/entities/kyc-profile.entity';
import { AuditModule } from '../audit/audit.module';
import { KycModule } from '../kyc/kyc.module';
import { EkycController } from './ekyc.controller';
import { EkycService } from './ekyc.service';
import { EkycAdapterRegistry, VnptEkycAdapter } from './vnpt-ekyc.adapter';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([KycProfileEntity]), AuditModule, KycModule, TenantConfigModule],
  controllers: [EkycController],
  providers: [EkycService, VnptEkycAdapter, EkycAdapterRegistry],
  exports: [EkycService],
})
export class EkycModule {}
