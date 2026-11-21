import { Body, Controller, HttpCode, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { PriceBookService } from './price-book.service';

function parseInstant(value: unknown, field: string, required: boolean): Date | null {
  if (value == null || value === '') {
    if (required) throw new UnprocessableEntityException({ detail: `${field} is required` });
    return null;
  }
  if (typeof value !== 'string') {
    throw new UnprocessableEntityException({ detail: `${field} is invalid` });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new UnprocessableEntityException({ detail: `${field} is invalid` });
  }
  return date;
}

@Controller('price-books')
export class PriceBookController {
  constructor(private readonly priceBooks: PriceBookService) {}

  @Post('versions')
  @HttpCode(201)
  openVersion(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      projectId?: string;
      versionNo?: number;
      effectiveFrom?: string;
      effectiveTo?: string | null;
      payload?: Record<string, unknown>;
    },
  ) {
    const effectiveFrom = parseInstant(body?.effectiveFrom, 'effective from', true);
    return this.priceBooks.openVersion({
      tenantId: user.tenantId,
      actorRole: user.role,
      projectId: body?.projectId ?? '',
      versionNo: body?.versionNo ?? 0,
      effectiveFrom: effectiveFrom as Date,
      effectiveTo: parseInstant(body?.effectiveTo, 'effective to', false),
      payload: body?.payload ?? {},
    });
  }

  @Post('quotes/:quoteId/status')
  @HttpCode(200)
  changeQuoteStatus(
    @CurrentUser() user: AuthUser,
    @Param('quoteId') quoteId: string,
    @Body() body: { status?: string },
  ) {
    return this.priceBooks.changeQuoteStatus({
      tenantId: user.tenantId,
      actorRole: user.role,
      quoteId,
      nextStatus: body?.status ?? '',
    });
  }
}
