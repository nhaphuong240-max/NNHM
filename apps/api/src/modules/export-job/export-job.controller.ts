import { Body, Controller, HttpCode, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ExportJobService } from './export-job.service';

@Controller('exports')
export class ExportJobController {
  constructor(private readonly exports: ExportJobService) {}

  @Post()
  @HttpCode(201)
  request(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { purpose?: string; expiresAt?: string; rowCount?: number; rowLimit?: number },
  ) {
    if (typeof body?.expiresAt !== 'string') {
      throw new UnprocessableEntityException({ detail: 'export expiry must be in the future' });
    }
    const expiresAt = new Date(body.expiresAt);
    return this.exports.request({
      tenantId: user.tenantId,
      requesterId: user.userId,
      purpose: body.purpose ?? '',
      expiresAt,
      rowCount: body.rowCount ?? 0,
      rowLimit: body.rowLimit ?? -1,
    });
  }

  @Post(':jobId/approve')
  @HttpCode(200)
  approve(@CurrentUser() user: AuthUser, @Param('jobId') jobId: string) {
    return this.exports.approve({
      tenantId: user.tenantId,
      jobId,
      approverId: user.userId,
      actorRole: user.role,
      now: new Date(),
    });
  }
}
