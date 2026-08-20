import { Body, Controller, Get, Headers, HttpCode, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './identity.types';
import { SsoService } from './sso.service';
import type { SsoProviderType } from './sso.util';

@Controller('auth/sso')
export class SsoController {
  constructor(
    private readonly sso: SsoService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('status')
  status() {
    return this.sso.status();
  }

  @Get('providers')
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    return this.sso.listProviders(resolveTenantId(this.config, user, tenantHeader));
  }

  @Post('providers')
  @HttpCode(200)
  upsert(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body()
    body: {
      type: SsoProviderType;
      label: string;
      issuerUrl: string;
      clientId: string;
      enabled?: boolean;
      roleMapping?: Record<string, string>;
    },
  ) {
    return this.sso.upsertProvider(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Public()
  @Get('authorize')
  authorize(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('providerId') providerId: string,
    @Query('emailHint') emailHint?: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    return this.sso.beginAuthorize(resolveTenantId(this.config, undefined, tenantHeader), {
      providerId,
      emailHint,
      redirectUri,
    });
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.sso.handleCallback({ code, state });
    const redirect = result.data.redirectUrl;
    const url = new URL(redirect);
    url.searchParams.set('accessToken', result.data.accessToken);
    url.searchParams.set('refreshToken', result.data.refreshToken);
    url.searchParams.set('expiresIn', String(result.data.expiresIn));
    res.redirect(url.toString());
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: { providerId: string; email: string; externalGroups?: string[] },
  ) {
    return this.sso.login(resolveTenantId(this.config, undefined, tenantHeader), body);
  }
}
