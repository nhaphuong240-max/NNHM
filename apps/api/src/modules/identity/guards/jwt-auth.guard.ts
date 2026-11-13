import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { readContractSignToken } from '../../booking/contract-sign-token';
import { ALLOW_CONTRACT_SIGN_TOKEN } from '../../booking/allow-contract-sign-token.decorator';
import { IS_PUBLIC_KEY } from '../identity.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const allowSignToken = this.reflector.getAllAndOverride<boolean>(ALLOW_CONTRACT_SIGN_TOKEN, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowSignToken && this.hasContractSignToken(context)) return true;
    return super.canActivate(context);
  }

  private hasContractSignToken(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string | undefined> }>();
    const presented = request.headers?.['x-contract-sign-token'];
    const secret = this.config.get<string>('CONTRACT_SIGN_SECRET') || this.config.get<string>('JWT_SECRET') || '';
    return readContractSignToken(presented, secret) !== null;
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException({ detail: 'Missing or invalid access token' });
    }
    return user;
  }
}
