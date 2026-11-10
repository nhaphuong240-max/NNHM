import { Global, Module } from '@nestjs/common';
import { PublicResourceTenantGuard } from './public-resource-tenant.guard';
import { PublicTokenTenantGuard } from './public-token-tenant.guard';
import { ShareLinkTenantGuard } from './share-link-tenant.guard';

@Global()
@Module({
  providers: [PublicTokenTenantGuard, PublicResourceTenantGuard, ShareLinkTenantGuard],
  exports: [PublicTokenTenantGuard, PublicResourceTenantGuard, ShareLinkTenantGuard],
})
export class PublicTenantModule {}
