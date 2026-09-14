import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { PaymentModule } from '../payment/payment.module';
import { SmsModule } from '../sms/sms.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { TenantWebhooksModule } from '../tenant-webhooks/tenant-webhooks.module';
import { CrmModule } from '../crm/crm.module';
import { BookingContractController } from './booking-contract.controller';
import { BookingContractEsignProviderService } from './booking-contract-esign-provider.service';
import { BookingContractEsignSmsService } from './booking-contract-esign-sms.service';
import { VnptEsignAdapter, EsignAdapterRegistry } from './vnpt-esign.adapter';
import { BookingContractService } from './booking-contract.service';
import { BookingEventsModule } from './booking-events.module';
import { BookingExpiryJob } from './booking-expiry.job';
import { BookingWorkflowController } from './booking-workflow.controller';
import { BookingWorkflowService } from './booking-workflow.service';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      UnitEntity,
      PaymentIntentEntity,
      LeadEntity,
      ProjectEntity,
      AuditEventEntity,
    ]),
    AuditModule,
    DocumentsModule,
    PaymentModule,
    BookingEventsModule,
    TenantWebhooksModule,
    SmsModule,
    ComplianceModule,
    TenantConfigModule,
    CrmModule,
  ],
  controllers: [BookingController, BookingContractController, BookingWorkflowController],
  providers: [
    BookingService,
    BookingContractService,
    BookingContractEsignSmsService,
    BookingContractEsignProviderService,
    VnptEsignAdapter,
    EsignAdapterRegistry,
    BookingExpiryJob,
    BookingWorkflowService,
  ],
  exports: [BookingService, BookingContractService],
})
export class BookingModule {}
