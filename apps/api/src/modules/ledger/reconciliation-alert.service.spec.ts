import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { ReconciliationReportEntity } from '../../database/entities/reconciliation-report.entity';
import { AuditService } from '../audit/audit.service';
import { ReconciliationAlertService } from './reconciliation-alert.service';

describe('ReconciliationAlertService', () => {
  let service: ReconciliationAlertService;
  const append = jest.fn(async () => undefined);

  beforeEach(async () => {
    append.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationAlertService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPS_ALERT_EMAIL') return 'finance-ops@sunrise-dev.vn';
              return undefined;
            }),
          },
        },
        { provide: AuditService, useValue: { append } },
      ],
    }).compile();

    service = module.get(ReconciliationAlertService);
  });

  it('logs email + webhook stub and writes audit on MISMATCH', async () => {
    const report = {
      id: 'rpt_test01',
      tenantId: 'ten_dev_01',
      reportDate: '2026-07-28',
      status: 'MISMATCH',
      gatewayTotal: '0',
      ledgerTotal: '1000000',
      gatewayCount: 0,
      ledgerCount: 1,
      discrepancies: [{ type: 'LEDGER_ONLY', detail: 'orphan journal' }],
    } as ReconciliationReportEntity;

    const result = await service.notifyMismatch('ten_dev_01', report);

    expect(result.email.status).toBe('STUB_SENT');
    expect(result.email.to).toBe('finance-ops@sunrise-dev.vn');
    expect(result.webhook.status).toBe('STUB_LOGGED');
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'reconciliation_alert',
        action: 'MISMATCH',
      }),
    );
  });
});
