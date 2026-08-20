import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import type { KycSubjectType } from '../../database/entities/kyc-profile.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { KycService } from './kyc.service';

@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get('status')
  status() {
    return this.kyc.status();
  }

  @Get('profiles')
  listProfiles(
    @CurrentUser() user: AuthUser,
    @Query('subjectType') subjectType?: KycSubjectType,
  ) {
    return this.kyc.listProfiles(user.tenantId, subjectType);
  }

  @Get('profiles/:subjectType/:subjectId')
  getProfile(
    @CurrentUser() user: AuthUser,
    @Param('subjectType') subjectType: KycSubjectType,
    @Param('subjectId') subjectId: string,
  ) {
    return this.kyc.getProfile(user.tenantId, subjectType, subjectId.trim());
  }

  @Post('profiles/:subjectType/:subjectId/approve')
  @HttpCode(200)
  approveProfile(
    @CurrentUser() user: AuthUser,
    @Param('subjectType') subjectType: KycSubjectType,
    @Param('subjectId') subjectId: string,
    @Body() body: { notes?: string },
  ) {
    return this.kyc.approveProfile(
      user.tenantId,
      subjectType,
      subjectId.trim(),
      user.userId,
      body?.notes,
    );
  }

  @Post('profiles/:subjectType/:subjectId/reject')
  @HttpCode(200)
  rejectProfile(
    @CurrentUser() user: AuthUser,
    @Param('subjectType') subjectType: KycSubjectType,
    @Param('subjectId') subjectId: string,
    @Body() body: { notes?: string },
  ) {
    return this.kyc.rejectProfile(
      user.tenantId,
      subjectType,
      subjectId.trim(),
      user.userId,
      body?.notes,
    );
  }

  @Get('profiles/:subjectType/:subjectId/workflow')
  getWorkflow(
    @CurrentUser() user: AuthUser,
    @Param('subjectType') subjectType: KycSubjectType,
    @Param('subjectId') subjectId: string,
  ) {
    return this.kyc.getWorkflow(user.tenantId, subjectType, subjectId.trim());
  }

  @Post('profiles/:subjectType/:subjectId/resubmit')
  @HttpCode(200)
  requestResubmit(
    @CurrentUser() user: AuthUser,
    @Param('subjectType') subjectType: KycSubjectType,
    @Param('subjectId') subjectId: string,
    @Body() body: { reason: string },
  ) {
    return this.kyc.requestResubmit(
      user.tenantId,
      subjectType,
      subjectId.trim(),
      body.reason,
      user.userId,
    );
  }
}
