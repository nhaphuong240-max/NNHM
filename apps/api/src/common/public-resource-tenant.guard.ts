import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { lookupTenantByResource } from './public-tenant-lookup';

type ResourceRequest = {
  params?: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  tenantId?: string;
};

@Injectable()
export class PublicResourceTenantGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ResourceRequest>();
    const projectId = request.params?.projectId?.trim() || request.query?.projectId?.trim();
    const eventId = request.params?.eventId?.trim();
    if (!projectId && !eventId) {
      throw new UnprocessableEntityException({
        detail: 'a public read needs a project or event id',
      });
    }
    const tenantId = projectId
      ? await lookupTenantByResource(this.dataSource, 'projects', projectId)
      : await lookupTenantByResource(this.dataSource, 'open_day_events', eventId!);
    if (!tenantId) {
      throw new NotFoundException({ detail: 'resource not found' });
    }
    const header = request.headers['x-tenant-id']?.trim();
    if (header && header !== tenantId) {
      throw new ForbiddenException({ detail: 'X-Tenant-Id does not match the resource tenant' });
    }
    request.tenantId = tenantId;
    return true;
  }
}
