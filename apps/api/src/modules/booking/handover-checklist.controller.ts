import { Body, Controller, HttpCode, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { HandoverChecklistService } from './handover-checklist.service';

@Controller('handover-checklists')
export class HandoverChecklistController {
  constructor(private readonly lists: HandoverChecklistService) {}

  @Post()
  @HttpCode(201)
  open(@CurrentUser() user: AuthUser, @Body() body: { bookingId?: string; items?: string[] }) {
    if (!body?.bookingId?.trim() || !Array.isArray(body.items)) {
      throw new UnprocessableEntityException({ detail: 'booking and items are required' });
    }
    return this.lists.open({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      bookingId: body.bookingId.trim(),
      items: body.items,
    });
  }

  @Post(':bookingId/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Param('bookingId') bookingId: string) {
    return this.lists.complete({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      bookingId,
    });
  }
}
