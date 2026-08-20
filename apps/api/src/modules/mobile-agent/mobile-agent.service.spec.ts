import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MobileDeviceEntity } from '../../database/entities/mobile-device.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AgentWauService } from '../analytics/agent-wau.service';
import { AuditService } from '../audit/audit.service';
import { CrmService } from '../crm/crm.service';
import { MobileAgentService } from './mobile-agent.service';
import { ExpoPushService } from './expo-push.service';

describe('MobileAgentService', () => {
  let service: MobileAgentService;
  let crm: { createActivity: jest.Mock };
  let devices: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let wau: { recordActivity: jest.Mock };
  let expoPush: { isLiveEnabled: jest.Mock; sendBatch: jest.Mock };
  let users: { find: jest.Mock };

  beforeEach(async () => {
    crm = {
      createActivity: jest.fn(async () => ({
        data: {
          id: 'act_test01',
          attributes: {
            leadId: 'ld_01',
            type: 'VISIT' as const,
            summary: 'GPS',
            metadata: null,
            createdBy: 'usr_agent',
            createdAt: new Date().toISOString(),
          },
        },
      })),
    };

    devices = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (row) => ({
        ...row,
        registeredAt: new Date(),
      })),
    };

    wau = { recordActivity: jest.fn().mockResolvedValue({}) };
    users = { find: jest.fn().mockResolvedValue([{ id: 'usr_agent_01', role: 'AGENT' }]) };
    expoPush = {
      isLiveEnabled: jest.fn(async () => false),
      sendBatch: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileAgentService,
        { provide: CrmService, useValue: crm },
        { provide: getRepositoryToken(MobileDeviceEntity), useValue: devices },
        { provide: getRepositoryToken(UserEntity), useValue: users },
        { provide: AgentWauService, useValue: wau },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        { provide: ExpoPushService, useValue: expoPush },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'false') } },
      ],
    }).compile();

    service = module.get(MobileAgentService);
    service.clearDevices();
  });

  it('registers push device token', async () => {
    const result = await service.registerDevice('ten_dev_01', 'usr_01', {
      pushToken: 'ExponentPushToken[abc]',
      platform: 'ios',
    });
    expect(result.data.pushToken).toBe('ExponentPushToken[abc]');
    devices.find.mockResolvedValueOnce([
      {
        id: 'md_01',
        pushToken: 'ExponentPushToken[abc]',
        platform: 'ios',
        deviceName: null,
        userId: 'usr_01',
        registeredAt: new Date(),
      },
    ]);
    const listed = await service.listDevices('ten_dev_01', 'usr_01');
    expect(listed.data).toHaveLength(1);
  });

  it('dedupes device registration by push token', async () => {
    devices.findOne.mockResolvedValueOnce({
      id: 'md_01',
      pushToken: 'tok',
      platform: 'ios',
      deviceName: null,
      userId: 'usr_01',
      registeredAt: new Date(),
    });
    const replay = await service.registerDevice('ten_dev_01', 'usr_01', { pushToken: 'tok' });
    expect(replay.meta.replay).toBe(true);
  });

  it('syncs activity batch and skips duplicate clientRequestId', async () => {
    const batch = {
      items: [
        {
          clientRequestId: 'req_01',
          leadId: 'ld_01',
          type: 'VISIT' as const,
          summary: 'Check-in',
          metadata: { latitude: 10.77, longitude: 106.69 },
        },
      ],
    };

    const first = await service.syncActivities('ten_dev_01', 'usr_01', batch);
    expect(first.data.synced).toHaveLength(1);
    expect(crm.createActivity).toHaveBeenCalledTimes(1);

    const second = await service.syncActivities('ten_dev_01', 'usr_01', batch);
    expect(second.data.skipped).toEqual(['req_01']);
    expect(crm.createActivity).toHaveBeenCalledTimes(1);
  });

  it('returns hint when push stub has no devices', async () => {
    const result = await service.sendPushStub('ten_dev_01', 'usr_01', {});
    expect(result.data.sent).toBe(0);
    expect(result.data.hint).toBeTruthy();
  });

  it('queues stub push for registered devices', async () => {
    devices.find.mockResolvedValueOnce([
      {
        id: 'md_01',
        pushToken: 'tok123456789',
        platform: 'ios',
        deviceName: null,
        userId: 'usr_01',
        registeredAt: new Date(),
      },
    ]);
    const result = await service.sendPushStub('ten_dev_01', 'usr_01', {
      title: 'SLA',
      body: 'Follow up now',
    });
    expect(result.data.sent).toBe(1);
    expect(result.data.deliveries[0].status).toBe('QUEUED_STUB');
    expect(expoPush.sendBatch).not.toHaveBeenCalled();
  });

  it('sends live push via Expo when enabled', async () => {
    expoPush.isLiveEnabled.mockResolvedValue(true);
    expoPush.sendBatch.mockResolvedValue([{ status: 'ok', id: 'ticket-1' }]);
    devices.find.mockResolvedValueOnce([
      {
        id: 'md_01',
        pushToken: 'ExponentPushToken[abc]',
        platform: 'ios',
        deviceName: null,
        userId: 'usr_01',
        registeredAt: new Date(),
      },
    ]);
    const result = await service.sendPushStub('ten_dev_01', 'usr_01', { title: 'SLA', body: 'Now' });
    expect(expoPush.sendBatch).toHaveBeenCalled();
    expect(result.data.deliveries[0].status).toBe('SENT_LIVE');
    expect(result.meta.mode).toBe('push-live');
  });

  it('records mobile activity for WAU', async () => {
    const result = await service.recordMobileActivity('ten_dev_01', 'usr_01', 'LEAD_CAPTURE', {
      mode: 'live',
    });
    expect(result.data.eventType).toBe('LEAD_CAPTURE');
    expect(wau.recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'LEAD_CAPTURE', source: 'MOBILE' }),
    );
  });

  it('rejects empty sync batch', async () => {
    await expect(
      service.syncActivities('ten_dev_01', 'usr_01', { items: [] }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('notifyNewLead sends push when push live enabled (OPS-S4-05)', async () => {
    expoPush.isLiveEnabled.mockResolvedValue(true);
    expoPush.sendBatch.mockResolvedValue([{ status: 'ok', id: 'ticket-lead' }]);
    devices.find.mockResolvedValueOnce([
      {
        id: 'md_01',
        tenantId: 'ten_pilot_cdt_01',
        pushToken: 'ExponentPushToken[lead]',
        platform: 'ios',
        deviceName: null,
        userId: 'usr_agent_01',
        registeredAt: new Date(),
      },
    ]);

    const result = await service.notifyNewLead('ten_pilot_cdt_01', {
      leadId: 'ld_new01',
      fullName: 'Zalo Buyer',
      source: 'ZALO_OA',
      assignedTo: 'usr_agent_01',
    });

    expect(result.data.sent).toBe(1);
    expect(expoPush.sendBatch).toHaveBeenCalled();
    expect(result.meta.slaTargetSeconds).toBe(300);
  });
});
