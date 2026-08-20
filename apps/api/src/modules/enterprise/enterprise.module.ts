import { Module } from '@nestjs/common';
import { SecurityModule } from '../../infrastructure/security/security.module';
import { IdentityModule } from '../identity/identity.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EnterpriseSignoffService } from './enterprise-signoff.service';

@Module({
  imports: [IdentityModule, IntegrationsModule, SecurityModule],
  providers: [EnterpriseSignoffService],
  exports: [EnterpriseSignoffService],
})
export class EnterpriseModule {}
