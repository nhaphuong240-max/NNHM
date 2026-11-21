import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AccessReviewItemEntity } from '../../database/entities/access-review-items.entity';
import {
  decideAccess,
  reviewItemsFromLegacyRoles,
  type AccessDecision,
  type Grant,
} from '../spec-target/spec-target.rules';

@Injectable()
export class AccessReviewService {
  constructor(
    @InjectRepository(AccessReviewItemEntity)
    private readonly items: Repository<AccessReviewItemEntity>,
  ) {}

  async queueLegacyRoles(
    tenantId: string,
    users: Array<{ userId: string; role: string }>,
  ): Promise<AccessReviewItemEntity[]> {
    const proposed = reviewItemsFromLegacyRoles(users);
    const saved: AccessReviewItemEntity[] = [];
    for (const item of proposed) {
      saved.push(
        await this.items.save(
          this.items.create({
            id: `arv_${randomBytes(12).toString('hex')}`,
            tenantId,
            userId: item.userId,
            roleCode: item.proposedRole ?? item.legacyRole,
            reason: 'legacy role needs a signed matrix',
            status: 'PENDING',
            payload: { needsHumanApproval: true, projectId: item.projectId },
          }),
        ),
      );
    }
    return saved;
  }

  decide(input: {
    actorTenantId: string;
    actorOrgId: string;
    action: string;
    resource: string;
    projectId: string;
    now: Date;
    grants: Grant[];
  }): AccessDecision {
    return decideAccess(input);
  }

  stepUp(): never {
    throw new UnprocessableEntityException({ detail: 'MFA step-up is not signed' });
  }

  breakGlass(): never {
    throw new UnprocessableEntityException({ detail: 'break-glass is not signed' });
  }
}
