/** Identity & auth — UC-ID-03 · S1-02 JWT */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { AuditModule } from '../audit/audit.module';
import { TenantConfigModule } from '../tenant-config/tenant-config.module';
import { AuthService } from './auth.service';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { JwtStrategy } from './jwt.strategy';
import { RefreshTokenStore } from './refresh-token.store';
import { MfaChallengeStore } from './mfa-challenge.store';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { TenantBrandingController } from './tenant-branding.controller';
import { TenantBrandingService } from './tenant-branding.service';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TenantEntity, AuditEventEntity]),
    AuditModule,
    TenantConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'wereal-dev-jwt-secret-change-me'),
        signOptions: {
          expiresIn: Number(config.get('JWT_EXPIRES_IN', 900)) || 900,
        },
      }),
    }),
  ],
  controllers: [
    IdentityController,
    TenantController,
    UserController,
    RoleController,
    SsoController,
    TenantBrandingController,
  ],
  providers: [
    IdentityService,
    AuthService,
    TenantService,
    UserService,
    RoleService,
    SsoService,
    TenantBrandingService,
    JwtStrategy,
    RefreshTokenStore,
    MfaChallengeStore,
  ],
  exports: [AuthService, JwtModule, PassportModule, TenantService, TenantBrandingService],
})
export class IdentityModule {}
