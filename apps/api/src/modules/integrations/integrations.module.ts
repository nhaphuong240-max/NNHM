import { Module, forwardRef } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApiMarketplaceModule } from '../api-marketplace/api-marketplace.module';
import { CommissionModule } from '../commission/commission.module';
import { LedgerModule } from '../ledger/ledger.module';
import { BankConnectorController } from './bank-connector.controller';
import { ErpInvoicingController } from './erp-invoicing.controller';
import { ErpInvoicingService } from './erp-invoicing.service';
import { NotaryConnectorController } from './notary-connector.controller';

@Module({
  imports: [ApiMarketplaceModule, LedgerModule, AnalyticsModule, forwardRef(() => CommissionModule)],
  controllers: [BankConnectorController, NotaryConnectorController, ErpInvoicingController],
  providers: [ErpInvoicingService],
  exports: [ErpInvoicingService],
})
export class IntegrationsModule {}
