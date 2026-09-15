import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './identity.types';
import type { ProjectScopeRule } from './role.service';
import { RoleService } from './role.service';
import type { TenantRole } from './role-catalog';

@Controller('roles')
export class RoleController {
  constructor(
    private readonly roles: RoleService,
    private readonly config: ConfigService,
  ) {}

  /** UC-ID-02 · SCR-ADMIN-021 — role catalog (reflects tenant matrix overrides) */
  @Get()
  catalog(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.roles.getCatalog(tenantId);
  }

  /** UC-ID-02 — master permission rows for matrix UI */
  @Get('permissions')
  permissions() {
    return this.roles.getPermissionCatalog();
  }

  /** UC-ID-02 — tenant RBAC matrix + ABAC project scope */
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
    @Body()
    body: {
      projectScopes?: ProjectScopeRule[];
      permissionMatrix?: Partial<Record<TenantRole, string[]>>;
    },
  ) {
    return this.roles.updatePolicy(resolveTenantId(this.config, user, tenantHeader), {
      projectScopes: body.projectScopes,
      permissionMatrix: body.permissionMatrix,
    });
  }
}
