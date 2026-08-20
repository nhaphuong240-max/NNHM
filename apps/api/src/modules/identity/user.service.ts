import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { isValidTenantRole } from './role-catalog';
import type { UserRecord } from './identity.types';

function mapUser(row: UserEntity): UserRecord {
  return {
    id: row.id,
    attributes: {
      email: row.email,
      role: row.role,
      status: row.isActive ? 'ACTIVE' : 'DEACTIVATED',
      tenantId: row.tenantId,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly audit: AuditService,
  ) {}

  /** UC-ID-04 stub — tenant-scoped user directory */
  async listUsers(tenantId: string): Promise<{ data: UserRecord[]; meta: { count: number; tenantId: string } }> {
    const rows = await this.users.find({
      where: { tenantId },
      order: { email: 'ASC' },
    });
    return { data: rows.map(mapUser), meta: { count: rows.length, tenantId } };
  }

  async getUser(tenantId: string, userId: string): Promise<{ data: UserRecord }> {
    const row = await this.users.findOne({ where: { id: userId, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `User ${userId} not found` });
    }
    return { data: mapUser(row) };
  }

  /** UC-ID-04 · SCR-ADMIN-021 — assign tenant role */
  async patchUserRole(
    tenantId: string,
    userId: string,
    role: string,
    actorId?: string,
  ): Promise<{ data: UserRecord }> {
    if (!isValidTenantRole(role)) {
      throw new UnprocessableEntityException({ detail: `Invalid role: ${role}` });
    }
    const row = await this.users.findOne({ where: { id: userId, tenantId } });
    if (!row) {
      throw new NotFoundException({ detail: `User ${userId} not found` });
    }
    const previous = row.role;
    row.role = role;
    await this.users.save(row);
    await this.audit.append({
      tenantId,
      entityType: 'user',
      entityId: userId,
      action: 'PATCH',
      payload: { field: 'role', before: previous, after: role },
      actorId: actorId ?? null,
    });
    return { data: mapUser(row) };
  }
}
