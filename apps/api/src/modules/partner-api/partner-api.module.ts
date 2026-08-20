import { Module } from '@nestjs/common';
import { ApiMarketplaceModule } from '../api-marketplace/api-marketplace.module';
import { BookingModule } from '../booking/booking.module';
import { CrmModule } from '../crm/crm.module';
import { GoldenRecordModule } from '../golden-record/golden-record.module';
import { PartnerApiController } from './partner-api.controller';
import { PartnerApiKeyGuard } from './partner-api-key.guard';

@Module({
  imports: [ApiMarketplaceModule, CrmModule, BookingModule, GoldenRecordModule],
  controllers: [PartnerApiController],
  providers: [PartnerApiKeyGuard],
})
export class PartnerApiModule {}
