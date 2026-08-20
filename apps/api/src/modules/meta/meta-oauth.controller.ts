import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { Public } from '../identity/decorators/public.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { MetaOAuthService, type MetaOAuthCallbackQuery } from './meta-oauth.service';

@Controller('integrations/meta/oauth')
export class MetaOAuthController {
  constructor(
    private readonly oauth: MetaOAuthService,
    private readonly config: ConfigService,
  ) {}

  /** Start Facebook OAuth redirect — returns permission URL */
  @Get('start')
  start(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    return this.oauth.startAuthorization(tenantId, user?.userId);
  }

  /** Meta redirect callback — public, exchanges code → page tokens → admin UI */
  @Public()
  @Get('callback')
  async callback(@Query() query: MetaOAuthCallbackQuery, @Res() res: Response) {
    try {
      const result = await this.oauth.handleCallback(query);
      res.redirect(this.oauth.buildSuccessRedirect(result));
    } catch (err) {
      res.redirect(this.oauth.buildErrorRedirect(this.oauth.formatCallbackError(err)));
    }
  }
}
