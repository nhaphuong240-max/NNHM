import { UnprocessableEntityException } from '@nestjs/common';
import { AccessReviewItemEntity } from '../../database/entities/access-review-items.entity';
import { AccessReviewService } from './access-review.service';

describe('access review queue', () => {
  it('queues a legacy role for a person and does not grant it', async () => {
    const rows: AccessReviewItemEntity[] = [];
    const items = {
      create: (row: AccessReviewItemEntity) => row,
      save: async (row: AccessReviewItemEntity) => {
        rows.push(row);
        return row;
      },
    };
    const service = new AccessReviewService(items as never);
    const saved = await service.queueLegacyRoles('ten_a', [{ userId: 'usr_1', role: 'AGENT' }]);
    expect(saved[0].status).toBe('PENDING');
    expect(saved[0].payload).toMatchObject({ needsHumanApproval: true, projectId: null });
    expect(saved[0].status).not.toBe('ACTIVE');
    expect(service.decide({
      actorTenantId: 'ten_a',
      actorOrgId: 'org_a',
      action: 'read',
      resource: 'unit',
      projectId: 'prj_a',
      now: new Date(),
      grants: [],
    })).toEqual({ allow: false, reason: 'deny-by-default' });
    expect(() => service.stepUp()).toThrow(UnprocessableEntityException);
    expect(() => service.breakGlass()).toThrow(UnprocessableEntityException);
  });
});
