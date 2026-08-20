import { Global, Module } from '@nestjs/common';
import { AuthLoginRateLimitGuard } from './auth-login-rate-limit.guard';
import { ProductionSecurityService } from './production-security.service';

@Global()
@Module({
  providers: [AuthLoginRateLimitGuard, ProductionSecurityService],
  exports: [AuthLoginRateLimitGuard, ProductionSecurityService],
})
export class SecurityModule {}
