import { Body, Controller, HttpCode, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ExceptionItemService } from './exception-item.service';

@Controller('exception-items')
export class ExceptionItemController {
  constructor(private readonly items: ExceptionItemService) {}

  @Post()
  @HttpCode(201)
  open(
    @CurrentUser() user: AuthUser,
    @Body() body: { severity?: string; dueAt?: string },
  ) {
    if (typeof body?.dueAt !== 'string') {
      throw new UnprocessableEntityException({ detail: 'due time must be in the future' });
    }
    return this.items.open({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorRole: user.role,
      severity: body.severity ?? '',
      dueAt: new Date(body.dueAt),
    });
  }

  @Post(':itemId/resolve')
  @HttpCode(200)
  resolve(@CurrentUser() user: AuthUser, @Param('itemId') itemId: string) {
    return this.items.resolve({
      tenantId: user.tenantId,
      itemId,
      actorId: user.userId,
      actorRole: user.role,
    });
  }
}
