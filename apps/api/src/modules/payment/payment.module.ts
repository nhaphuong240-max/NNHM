import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BnplApplicationEntity } from '../../database/entities/bnpl-application.entity';
import { BnplInstallmentEntity } from '../../database/entities/bnpl-installment.entity';
import { EscrowAccountEntity } from '../../database/entities/escrow-account.entity';
import { EscrowMilestoneEntity } from '../../database/entities/escrow-milestone.entity';
import { EscrowReleaseEventEntity } from '../../database/entities/escrow-release-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentIntentEntity } from '../../database/entities/payment-intent.entity';
import { PaymentWebhookEventEntity } from '../../database/entities/payment-webhook-event.entity';
import { RefundEntity } from '../../database/entities/refund.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditModule } from '../audit/audit.module';
import { BookingEventsModule } from '../booking/booking-events.module';
import { LedgerModule } from '../ledger/ledger.module';
import { SmsModule } from '../sms/sms.module';
import { ZaloModule } from '../zalo/zalo.module';
import { TenantWebhooksModule } from '../tenant-webhooks/tenant-webhooks.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { MockPaymentAdapter } from './adapters/mock-payment.adapter';
import { VnpayPaymentAdapter } from './adapters/vnpay-payment.adapter';
import { MockPaymentCompleteController } from './mock-payment-complete.controller';
import { PaymentGatewayAdminController } from './payment-gateway-admin.controller';
import { PaymentGatewayAdminService } from './payment-gateway-admin.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { BnplPartnerClient } from './bnpl-partner.client';
import { PaymentBnplService } from './payment-bnpl.service';
import { PaymentBnplController } from './payment-bnpl.controller';
import { PaymentEscrowController } from './payment-escrow.controller';
import { PaymentEscrowService } from './payment-escrow.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { PaymentWebhookService } from './webhook/payment-webhook.service';
import { WebhookIdempotencyService } from './webhook/webhook-idempotency.service';
import { WebhookController } from './webhook/webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentIntentEntity,
      BookingEntity,
      PaymentWebhookEventEntity,
      RefundEntity,
      UnitEntity,
      AuditEventEntity,
      BnplApplicationEntity,
      BnplInstallmentEntity,
      EscrowAccountEntity,
      EscrowMilestoneEntity,
      EscrowReleaseEventEntity,
    ]),
    AuditModule,
    LedgerModule,
    BookingEventsModule,
    ZaloModule,
    SmsModule,
    TenantWebhooksModule,
    TenantConfigModule,
  ],
  controllers: [
    PaymentController,
    WebhookController,
    MockPaymentCompleteController,
    RefundController,
    PaymentGatewayAdminController,
    PaymentEscrowController,
    PaymentBnplController,
  ],
  providers: [
    PaymentService,
    RefundService,
    PaymentWebhookService,
    WebhookIdempotencyService,
    PaymentOrchestratorService,
    PaymentGatewayAdminService,
    PaymentEscrowService,
    PaymentBnplService,
    BnplPartnerClient,
    VnpayPaymentAdapter,
    MockPaymentAdapter,
  ],
  exports: [PaymentService, PaymentWebhookService, RefundService, PaymentEscrowService, PaymentBnplService],
})
export class PaymentModule {}
