import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { TenantRlsInterceptor } from './database/tenant-rls.interceptor';
import { RedisModule } from './infrastructure/redis/redis.module';
import { TelemetryModule } from './infrastructure/telemetry/telemetry.module';
import { RootController } from './root.controller';
import { JwtAuthGuard } from './modules/identity/guards/jwt-auth.guard';
import { TenantGuard } from './modules/identity/guards/tenant.guard';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { SecurityModule } from './infrastructure/security/security.module';
import { GoldenRecordModule } from './modules/golden-record/golden-record.module';
import { ListingModule } from './modules/listing/listing.module';
import { SearchModule } from './modules/search/search.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentModule } from './modules/payment/payment.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { AuditModule } from './modules/audit/audit.module';
import { CommissionModule } from './modules/commission/commission.module';
import { KycModule } from './modules/kyc/kyc.module';
import { AiScoringModule } from './modules/ai-scoring/ai-scoring.module';
import { AiCopilotModule } from './modules/ai-copilot/ai-copilot.module';
import { AiAnomalyModule } from './modules/ai-anomaly/ai-anomaly.module';
import { AiLegalModule } from './modules/ai-legal/ai-legal.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { AiReplyModule } from './modules/ai-reply/ai-reply.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { TenantWebhooksModule } from './modules/tenant-webhooks/tenant-webhooks.module';
import { ApiMarketplaceModule } from './modules/api-marketplace/api-marketplace.module';
import { MetaModule } from './modules/meta/meta.module';
import { ZaloModule } from './modules/zalo/zalo.module';
import { StreamModule } from './modules/stream/stream.module';
import { CrmModule } from './modules/crm/crm.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SmsModule } from './modules/sms/sms.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TrustModule } from './modules/trust/trust.module';
import { PortalModule } from './modules/portal/portal.module';
import { MobileAgentModule } from './modules/mobile-agent/mobile-agent.module';
import { TenantConfigModule } from './modules/tenant-config/tenant-config.module';
import { OpsModule } from './modules/ops/ops.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { EkycModule } from './modules/ekyc/ekyc.module';
import { PartnerApiModule } from './modules/partner-api/partner-api.module';
import { AnchorModule } from './modules/anchor/anchor.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';

/** ADR-001 modular monolith — domain modules only communicate via events/facades. */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    SecurityModule,
    TelemetryModule,
    StreamModule,
    HealthModule,
    IdentityModule,
    GoldenRecordModule,
    ListingModule,
    SearchModule,
    CrmModule,
    BookingModule,
    PaymentModule,
    LedgerModule,
    AuditModule,
    CommissionModule,
    KycModule,
    MetaModule,
    ZaloModule,
    SmsModule,
    MarketingModule,
    DocumentsModule,
    AiScoringModule,
    AiCopilotModule,
    AiAnomalyModule,
    AiLegalModule,
    AiGatewayModule,
    AiReplyModule,
    AiChatModule,
    ApiMarketplaceModule,
    TenantWebhooksModule,
    AnalyticsModule,
    TrustModule,
    PortalModule,
    MobileAgentModule,
    TenantConfigModule,
    OpsModule,
    ComplianceModule,
    EkycModule,
    PartnerApiModule,
    AnchorModule,
    IntegrationsModule,
    EnterpriseModule,
  ],
  controllers: [RootController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantRlsInterceptor },
  ],
})
export class AppModule {}
