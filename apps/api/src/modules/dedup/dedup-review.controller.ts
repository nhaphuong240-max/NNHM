import { Body, Controller, HttpCode, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { DedupReviewService } from './dedup-review.service';

@Controller('dedup-reviews')
export class DedupReviewController {
  constructor(private readonly reviews: DedupReviewService) {}

  @Post()
  @HttpCode(201)
  enqueue(@CurrentUser() user: AuthUser, @Body() body: { leadId?: string }) {
    const leadId = body?.leadId?.trim() ?? '';
    if (!leadId) throw new UnprocessableEntityException({ detail: 'lead is required' });
    return this.reviews.enqueue({ tenantId: user.tenantId, leadId });
  }

  @Post(':reviewId/distinct')
  @HttpCode(200)
  markDistinct(@CurrentUser() user: AuthUser, @Param('reviewId') reviewId: string) {
    return this.reviews.markDistinct({
      tenantId: user.tenantId,
      reviewId,
      actorRole: user.role,
    });
  }
}
