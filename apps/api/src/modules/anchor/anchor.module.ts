import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnchorTenantProfileEntity } from '../../database/entities/anchor-tenant-profile.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { DistributionPolicyEntity } from '../../database/entities/distribution-policy.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { GoldenRecordModule } from '../golden-record/golden-record.module';
import { AnchorTenantController } from './anchor-tenant.controller';
import { AnchorTenantService } from './anchor-tenant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnchorTenantProfileEntity,
      ProjectEntity,
      BookingEntity,
      DistributionPolicyEntity,
    ]),
    GoldenRecordModule,
  ],
  controllers: [AnchorTenantController],
  providers: [AnchorTenantService],
  exports: [AnchorTenantService],
})
export class AnchorModule {}
