import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditEventEntity } from '../../database/entities/audit-event.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { UnitEntity } from '../../database/entities/unit.entity';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { BookingContractEsignSmsService } from './booking-contract-esign-sms.service';
import { BookingContractEsignProviderService } from './booking-contract-esign-provider.service';
import { ConsentLedgerService } from '../compliance/consent-ledger.service';
import { BookingContractService } from './booking-contract.service';

describe('BookingContractService', () => {
  let service: BookingContractService;
  const auditAppend = jest.fn().mockResolvedValue({});

  const draftPayload = {
    templateId: 'tpl_deposit_agreement',
    templateLabel: 'Hợp đồng đặt cọc',
    bookingId: 'bk_contract01',
    leadId: 'ld_01',
    mergedText: 'Demo contract for Thu Trang',
    mergeContext: {
      buyerName: 'Thu Trang',
      buyerPhone: '+84901234567',
      unitCode: 'A-12-05',
      basePrice: 3850000000,
      bookingId: 'bk_contract01',
      projectName: 'Sunrise Tower A',
      agentLabel: 'Agent',
      contractDate: '29/07/2026',
    },
  };

  const auditEvents = {
    findOne: jest.fn(({ where }: { where: Record<string, string> }) => {
      if (where.entityId === 'ctr_demo01' && where.action === 'DRAFT') {
        return Promise.resolve({
          entityId: 'ctr_demo01',
          payload: draftPayload,
          createdAt: new Date('2026-07-01'),
          actorId: 'usr_agent_01',
        });
      }
      if (where.entityId === 'ctr_demo01' && where.action === 'SIGNED') {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const bookings = {
      findOne: jest.fn().mockResolvedValue({
        id: 'bk_contract01',
        tenantId: 'ten_dev_01',
        unitId: 'un_01',
        leadId: 'ld_01',
        depositAmount: '50000000',
      }),
    };
    const units = {
      findOne: jest.fn().mockResolvedValue({
        id: 'un_01',
        tenantId: 'ten_dev_01',
        projectId: 'prj_sunrise',
        code: 'A-12-05',
        area: '68.00',
        basePrice: '3850000000',
        project: { id: 'prj_sunrise', name: 'Sunrise Tower A' },
      }),
    };
    const leads = {
      findOne: jest.fn().mockResolvedValue({
        id: 'ld_01',
        fullName: 'Thu Trang',
        phone: '+84901234567',
        email: 'trang@example.com',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingContractService,
        { provide: getRepositoryToken(BookingEntity), useValue: bookings },
        { provide: getRepositoryToken(UnitEntity), useValue: units },
        { provide: getRepositoryToken(ProjectEntity), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(LeadEntity), useValue: leads },
        { provide: getRepositoryToken(AuditEventEntity), useValue: auditEvents },
        { provide: AuditService, useValue: { append: auditAppend } },
        {
          provide: DocumentsService,
          useValue: {
            uploadFromBuffer: jest.fn().mockResolvedValue({
              data: { id: 'doc_signed_demo01' },
              meta: {},
            }),
            putSignedCopy: jest.fn().mockResolvedValue({ id: 'doc_signed_demo01' }),
          },
        },
        {
          provide: BookingContractEsignSmsService,
          useValue: {
            sendContractOtp: jest.fn().mockResolvedValue({
              sent: true,
              sandbox: true,
              deliveryId: 'sms_esign01',
            }),
            validateContractOtp: jest.fn(async (_t: string, _c: string, otp: string) => otp === '123456'),
          },
        },
        {
          provide: BookingContractEsignProviderService,
          useValue: { resolve: jest.fn(async () => null), status: jest.fn() },
        },
        {
          provide: ConsentLedgerService,
          useValue: { record: jest.fn().mockResolvedValue({ data: { id: 'cns_test' } }) },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: () => ({
              find: async () => [],
              findOne: async () => null,
              save: async (row: unknown) => row,
            }),
            createQueryRunner: () => ({
              connect: async () => undefined,
              startTransaction: async () => undefined,
              commitTransaction: async () => undefined,
              rollbackTransaction: async () => undefined,
              release: async () => undefined,
              query: async (sql: string) => (sql.includes('FOR UPDATE') ? [{ signed_pdf_document_id: null }] : [{ id: 'sreq_1' }]),
              manager: {
                getRepository: () => ({
                  find: async () => [],
                  findOne: async () => ({ id: 'aud_signed', payload: {} }),
                  save: async (row: unknown) => row,
                }),
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(BookingContractService);
  });

  it('lists contract templates', () => {
    const result = service.listTemplates();
    expect(result.data.length).toBeGreaterThanOrEqual(3);
  });

  it('previews merged contract text', async () => {
    const result = await service.preview('ten_dev_01', {
      templateId: 'tpl_deposit_agreement',
      bookingId: 'bk_contract01',
    });
    expect(result.data.mergedText).toContain('Thu Trang');
    expect(result.data.mergedText).toContain('bk_contract01');
  });

  it('creates audit-backed draft', async () => {
    const result = await service.createDraft(
      'ten_dev_01',
      { templateId: 'tpl_deposit_agreement', bookingId: 'bk_contract01' },
      'usr_agent_01',
    );
    expect(result.data.id.startsWith('ctr_')).toBe(true);
    expect(auditAppend).toHaveBeenCalled();
  });

  it('returns sign session for draft contract', async () => {
    const result = await service.getSignSession('ten_dev_01', 'ctr_demo01');
    expect(result.data.contractId).toBe('ctr_demo01');
    expect(result.data.mergedText).toContain('Thu Trang');
    expect(result.data).not.toHaveProperty('signingUrl');
  });

  it('signs contract with demo OTP', async () => {
    const manager = {
      query: async () => [{ id: 'ssgn_1' }],
      getRepository: (entity?: { name?: string }) => {
        if (entity?.name === 'AuditEventEntity') {
          return {
            findOne: async ({ where }: { where: Record<string, string> }) =>
              where.action === 'DRAFT'
                ? { payload: draftPayload, createdAt: new Date('2026-07-01'), actorId: 'usr_agent_01' }
                : null,
            save: async (row: unknown) => row,
          };
        }
        return {
          find: async () => [],
          findOne: async () => null,
          save: async (row: { id?: string }) => ({ ...row, id: row.id ?? 'sev_1' }),
        };
      },
    };
    auditAppend.mockResolvedValue({ id: 'aud_signed' });
    const prepared = await service.signContract(
      'ten_dev_01',
      'ctr_demo01',
      { signerName: 'Thu Trang', otp: '123456', consent: true },
      {
        tenantId: 'ten_dev_01',
        contractId: 'ctr_demo01',
        buyerId: 'usr_buyer',
        signerId: 'ssgn_1',
        requestId: 'sreq_1',
        jti: 'jti_1',
        channel: 'SMS',
        exp: Date.now() + 60_000,
      },
      false,
      manager as never,
      'WEREAL_ESIGN_STUB',
    );
    const result = await service.finishSignedVault(prepared);
    expect(result.data.attributes.status).toBe('SIGNED');
    expect(result.data.attributes.documentId).toBe('doc_signed_demo01');
    expect(result.data.attributes.documentVaultRef).toBe('doc_signed_demo01');
    expect(auditAppend).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SIGNED', entityId: 'ctr_demo01' }),
      manager,
    );
  });
});
