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
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { TenantService } from '../identity/tenant.service';
import { MarketingService } from './marketing.service';
import type {
  CreateDistributionPolicyInput,
  ReviewApplicationInput,
  SubmitApplicationInput,
} from './marketing.types';

@Controller('marketing')
export class MarketingController {
  constructor(
    private readonly marketing: MarketingService,
    private readonly tenants: TenantService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.marketing.status();
  }

  @Get('distribution/policies')
  listPolicies(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('projectId') projectId?: string,
  ) {
    return this.marketing.listPolicies(
      resolveTenantId(this.config, user, tenantHeader),
      projectId,
    );
  }

  @Post('distribution/policies')
  @HttpCode(201)
  createPolicy(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateDistributionPolicyInput,
  ) {
    return this.marketing.createPolicy(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('distribution/policies/:policyId/publish')
  @HttpCode(200)
  publishPolicy(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('policyId') policyId: string,
  ) {
    return this.marketing.publishPolicy(
      resolveTenantId(this.config, user, tenantHeader),
      policyId,
      user?.userId,
    );
  }

  @Get('marketplace/projects')
  listMarketplace(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.marketing.listMarketplaceProjects(
      resolveTenantId(this.config, user, tenantHeader),
    );
  }

  @Post('marketplace/applications')
  @HttpCode(201)
  submitApplication(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: SubmitApplicationInput,
  ) {
    return this.marketing.submitApplication(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Get('applications')
  listApplications(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('status') status?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.tenants.getTenant(tenantId).then((tenant) =>
      this.marketing.listApplications(tenantId, tenant.data.attributes.type, status),
    );
  }

  @Patch('applications/:applicationId/review')
  reviewApplication(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('applicationId') applicationId: string,
    @Body() body: ReviewApplicationInput,
  ) {
    return this.marketing.reviewApplication(
      resolveTenantId(this.config, user, tenantHeader),
      applicationId,
      body,
      user?.userId,
    );
  }
}
