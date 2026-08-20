import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileDeviceEntity } from '../../database/entities/mobile-device.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuditModule } from '../audit/audit.module';
import { CrmModule } from '../crm/crm.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { MobileAgentController } from './mobile-agent.controller';
import { ExpoPushService } from './expo-push.service';
import { MobileAgentService } from './mobile-agent.service';

@Module({
  imports: [
    forwardRef(() => CrmModule),
    AnalyticsModule,
    AuditModule,
    TenantConfigModule,
    TypeOrmModule.forFeature([MobileDeviceEntity, UserEntity]),
  ],
  controllers: [MobileAgentController],
  providers: [MobileAgentService, ExpoPushService],
  exports: [MobileAgentService, ExpoPushService],
})
export class MobileAgentModule {}
