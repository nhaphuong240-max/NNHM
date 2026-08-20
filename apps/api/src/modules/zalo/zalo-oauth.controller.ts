import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ZaloOAuthService, type ZaloOAuthCallbackQuery } from './zalo-oauth.service';

@Controller('integrations/zalo/oauth')
export class ZaloOAuthController {
  constructor(
    private readonly oauth: ZaloOAuthService,
    private readonly config: ConfigService,
  ) {}

  /** Start OAuth redirect — returns Zalo permission URL (PKCE v4) */
  @Get('start')
  start(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('oaId') oaId?: string,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.oauth.startAuthorization(
      tenantId,
      oaId?.trim() || 'oa_sunrise_dev',
      user?.userId,
    );
  }

  /** Zalo redirect callback — public, exchanges code → tokens → admin UI */
  @Public()
  @Get('callback')
  async callback(@Query() query: ZaloOAuthCallbackQuery, @Res() res: Response) {
    try {
      const result = await this.oauth.handleCallback(query);
      res.redirect(this.oauth.buildSuccessRedirect(result));
    } catch (err) {
      res.redirect(this.oauth.buildErrorRedirect(this.oauth.formatCallbackError(err)));
    }
  }
}
