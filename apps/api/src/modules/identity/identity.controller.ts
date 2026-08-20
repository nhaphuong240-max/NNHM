import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthLoginRateLimitGuard } from '../../infrastructure/security/auth-login-rate-limit.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { IdentityService } from './identity.service';
import type { AuthUser, LoginInput, MfaVerifyInput, RefreshInput } from './identity.types';

@Controller()
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Get('auth/status')
  status() {
    return this.identity.status();
  }

  /** API-001 POST /auth/login — UC-ID-03 · S1-02 */
  @Public()
  @UseGuards(AuthLoginRateLimitGuard)
  @Post('auth/login')
  @HttpCode(200)
  login(@Body() body: LoginInput) {
    return this.auth.login(body);
  }

  /** API-002 POST /auth/refresh */
  @Public()
  @UseGuards(AuthLoginRateLimitGuard)
  @Post('auth/refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshInput) {
    return this.auth.refresh(body);
  }

  /** GET /auth/me — current session + tenant (SCR-AUTH-001) */
  @Get('auth/me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getMe(user);
  }

  /** POST /auth/mfa/verify — TOTP live when tenant mfaSandbox=false (OPS-S2) */
  @Public()
  @UseGuards(AuthLoginRateLimitGuard)
  @Post('auth/mfa/verify')
  @HttpCode(200)
  verifyMfa(@Body() body: MfaVerifyInput) {
    return this.auth.verifyMfa(body);
  }

  /** API-003 POST /auth/logout */
  @Post('auth/logout')
  @HttpCode(204)
  logout(@Body() body: RefreshInput) {
    this.auth.logout(body.refreshToken);
  }
}
