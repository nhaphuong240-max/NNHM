import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './identity.types';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly users: UserService,
    private readonly config: ConfigService,
  ) {}

  /** UC-ID-04 GET /users — tenant user directory stub */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.users.listUsers(resolveTenantId(this.config, user, tenantHeader));
  }

  @Get(':userId')
  getOne(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('userId') userId: string,
  ) {
    return this.users.getUser(resolveTenantId(this.config, user, tenantHeader), userId);
  }

  @Patch(':userId/role')
  patchRole(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    return this.users.patchUserRole(
      resolveTenantId(this.config, user, tenantHeader),
      userId,
      body.role,
      user?.userId,
    );
  }
}
