import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './identity.types';
import type { ProjectScopeRule } from './role.service';
import { RoleService } from './role.service';

@Controller('roles')
export class RoleController {
  constructor(
    private readonly roles: RoleService,
    private readonly config: ConfigService,
  ) {}

  /** UC-ID-02 · SCR-ADMIN-021 — role catalog */
  @Get()
  catalog() {
    return this.roles.getCatalog();
  }

  /** UC-ID-02 — ABAC project scope (in-memory stub) */
  @Get('policy')
  policy(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.roles.getPolicy(resolveTenantId(this.config, user, tenantHeader));
  }

  @Patch('policy')
  updatePolicy(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { projectScopes: ProjectScopeRule[] },
  ) {
    return this.roles.updatePolicy(resolveTenantId(this.config, user, tenantHeader), {
      projectScopes: body.projectScopes ?? [],
    });
  }
}
