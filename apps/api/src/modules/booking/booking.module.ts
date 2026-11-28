import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { ContractArtifactEntity } from '../../database/entities/contract-artifacts.entity';
import { EsignOtpChallengeEntity } from '../../database/entities/esign-otp-challenge.entity';
import { HandoverChecklistEntity } from '../../database/entities/handover-checklists.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import { SignatureRequestEntity } from '../../database/entities/signature-request.entity';
import { SignatureSignerEntity } from '../../database/entities/signature-signer.entity';
import { EsignDownloadTicketEntity } from '../../database/entities/esign-download-ticket.entity';
import { SignerChannelVerificationEntity } from '../../database/entities/signer-channel-verification.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AllocationModule } from '../allocation/allocation.module';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { PaymentModule } from '../payment/payment.module';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { TenantWebhooksModule } from '../tenant-webhooks/tenant-webhooks.module';
import { CrmModule } from '../crm/crm.module';
import { NotifyModule } from '../notify/notify.module';
import { BookingContractController } from './booking-contract.controller';
import { EsignSandboxController } from './esign-sandbox.controller';
import { EsignChannelVerificationController } from './esign-channel-verification.controller';
import { SignaturePartyController } from './signature-party.controller';
import { SignaturePartyService } from './signature-party.service';
import { SignerChannelVerificationService } from './signer-channel-verification.service';
import { LeadChannelRevokeSubscriber } from './lead-channel-revoke.subscriber';
import { SandboxEsignOutbox } from './sandbox-esign-outbox';
import { ContractArtifactController } from './contract-artifact.controller';
import { ContractArtifactService } from './contract-artifact.service';
import { HandoverChecklistController } from './handover-checklist.controller';
import { HandoverChecklistService } from './handover-checklist.service';
import { BookingContractEsignProviderService } from './booking-contract-esign-provider.service';
import { BookingContractEsignSmsService } from './booking-contract-esign-sms.service';
import { EsignDownloadController } from './esign-download.controller';
import { EsignDownloadTicketService } from './esign-download-ticket.service';
import { EsignLinkService } from './esign-link.service';
import { EsignOtpChallengeService } from './esign-otp-challenge.service';
import { SignatureTicketService } from './signature-ticket.service';
import { VnptEsignAdapter, EsignAdapterRegistry } from './vnpt-esign.adapter';
import { BookingContractService } from './booking-contract.service';
import { BookingEventsModule } from './booking-events.module';
import { BookingExpiryJob } from './booking-expiry.job';
import { EsignVaultRetryJob } from './esign-vault-retry.job';
import { BookingWorkflowController } from './booking-workflow.controller';
import { BookingWorkflowService } from './booking-workflow.service';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      ContractArtifactEntity,
      EsignOtpChallengeEntity,
      HandoverChecklistEntity,
      SignatureEventEntity,
      SignatureRequestEntity,
      SignatureSignerEntity,
      SignerChannelVerificationEntity,
      EsignDownloadTicketEntity,
      UnitEntity,
      PaymentIntentEntity,
      LeadEntity,
      UserEntity,
      ProjectEntity,
      AuditEventEntity,
    ]),
    AllocationModule,
    AuditModule,
    DocumentsModule,
    PaymentModule,
    BookingEventsModule,
    TenantWebhooksModule,
    SmsModule,
    EmailModule,
    ComplianceModule,
    TenantConfigModule,
    CrmModule,
    NotifyModule,
  ],
  controllers: [
    BookingController,
    BookingContractController,
    BookingWorkflowController,
    ContractArtifactController,
    HandoverChecklistController,
    EsignSandboxController,
    EsignChannelVerificationController,
    SignaturePartyController,
    EsignDownloadController,
  ],
  providers: [
    BookingService,
    BookingContractService,
    ContractArtifactService,
    HandoverChecklistService,
    BookingContractEsignSmsService,
    EsignLinkService,
    SignerChannelVerificationService,
    EsignDownloadTicketService,
    LeadChannelRevokeSubscriber,
    SignaturePartyService,
    SandboxEsignOutbox,
    EsignOtpChallengeService,
    SignatureTicketService,
    BookingContractEsignProviderService,
    VnptEsignAdapter,
    EsignAdapterRegistry,
    BookingExpiryJob,
    EsignVaultRetryJob,
    BookingWorkflowService,
  ],
  exports: [BookingService, BookingContractService, SignatureTicketService, EsignLinkService],
})
export class BookingModule {}
