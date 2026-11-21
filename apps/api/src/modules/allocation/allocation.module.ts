import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributionAgreementEntity } from '../../database/entities/distribution-agreements.entity';
import { UnitAllocationEntity } from '../../database/entities/unit-allocations.entity';
import { AllocationController } from './allocation.controller';
import { AllocationService } from './allocation.service';

@Module({
  imports: [TypeOrmModule.forFeature([DistributionAgreementEntity, UnitAllocationEntity])],
  controllers: [AllocationController],
  providers: [AllocationService],
  exports: [AllocationService],
})
export class AllocationModule {}
