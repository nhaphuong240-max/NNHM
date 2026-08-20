import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { ListingEntity } from '../../database/entities/listing.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ListingService } from './listing.service';
import type { CreateListingInput } from './listing.types';

@Controller('listings')
export class ListingController {
  constructor(
    private readonly listing: ListingService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
    @Query('status') status?: ListingEntity['status'],
  ) {
    return this.listing.list(resolveTenantId(this.config, user, tenantHeader), status);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateListingInput,
  ) {
    return this.listing.create(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('drift-check')
  @HttpCode(200)
  checkDrift(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { unitId: string; priceDisplay?: number; areaDisplay?: number },
  ) {
    return this.listing.checkDrift(resolveTenantId(this.config, user, tenantHeader), body);
  }

  /** UC-LS-06 · SCR-ADMIN-009 */
  @Get('duplicates')
  duplicates(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.listing.findDuplicateGroups(resolveTenantId(this.config, user, tenantHeader));
  }

  @Patch('duplicates/:groupKey/resolve')
  resolveDuplicate(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('groupKey') groupKey: string,
    @Body() body: { action?: 'KEEP_PRIMARY_REJECT_OTHERS' },
  ) {
    return this.listing.resolveDuplicateGroup(
      resolveTenantId(this.config, user, tenantHeader),
      decodeURIComponent(groupKey),
      body.action ?? 'KEEP_PRIMARY_REJECT_OTHERS',
      user?.userId,
    );
  }

  @Get(':listingId')
  getOne(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
  ) {
    return this.listing.getById(resolveTenantId(this.config, user, tenantHeader), listingId);
  }

  @Post(':listingId/submit-review')
  submitReview(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
  ) {
    return this.listing.submitReview(
      resolveTenantId(this.config, user, tenantHeader),
      listingId,
      user?.userId,
    );
  }

  @Patch(':listingId/approve')
  approve(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
  ) {
    return this.listing.approve(
      resolveTenantId(this.config, user, tenantHeader),
      listingId,
      user?.userId,
    );
  }

  @Patch(':listingId/reject')
  reject(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @Body() body: { reason: string; code?: string },
  ) {
    return this.listing.reject(
      resolveTenantId(this.config, user, tenantHeader),
      listingId,
      body.reason ?? 'Rejected by moderation',
      body.code,
      user?.userId,
    );
  }
}
