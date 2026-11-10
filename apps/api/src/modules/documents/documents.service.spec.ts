import { UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentAccessLogEntity } from '../../database/entities/document-access-log.entity';
import { DocumentEntity } from '../../database/entities/document.entity';
import { AuditService } from '../audit/audit.service';
import { ConsentLedgerService } from '../compliance/consent-ledger.service';
import { DocumentsService } from './documents.service';
import { DOCUMENT_STORAGE_ADAPTER } from './storage/storage.types';

const TENANT = 'ten_dev_01';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documents: DocumentEntity[];
  let accessLogs: DocumentAccessLogEntity[];
  const putObject = jest.fn();
  const getObjectStream = jest.fn();
  const hasValidConsent = jest.fn();

  beforeEach(async () => {
    documents = [];
    accessLogs = [];
    putObject.mockReset();
    getObjectStream.mockReset();
    hasValidConsent.mockReset();
    hasValidConsent.mockResolvedValue(true);
    putObject.mockResolvedValue({ storageKey: 'project/prj/a.txt', provider: 'LOCAL', sizeBytes: 12 });
    getObjectStream.mockResolvedValue(
      (async function* () {
        yield Buffer.from('hello vault');
      })(),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: {
            find: jest.fn(async () => documents),
            findOne: jest.fn(async ({ where }: { where: Record<string, string> }) =>
              documents.find(
                (d) =>
                  (!where.id || d.id === where.id) &&
                  (!where.tenantId || d.tenantId === where.tenantId) &&
                  (!where.contentHash || d.contentHash === where.contentHash),
              ) ?? null,
            ),
            save: jest.fn(async (row: DocumentEntity) => {
              const saved = {
                ...row,
                createdAt: row.createdAt ?? new Date(),
                updatedAt: new Date(),
              };
              documents.push(saved);
              return saved;
            }),
          },
        },
        {
          provide: getRepositoryToken(DocumentAccessLogEntity),
          useValue: {
            find: jest.fn(async () => accessLogs),
            save: jest.fn(async (row: DocumentAccessLogEntity) => {
              accessLogs.push(row);
              return row;
            }),
          },
        },
        {
          provide: DOCUMENT_STORAGE_ADAPTER,
          useValue: {
            mode: 'local',
            putObject,
            getObjectStream,
            deleteObject: jest.fn(),
            presignUpload: jest.fn().mockResolvedValue({
              uploadUrl: '/upload',
              storageKey: 'k',
              provider: 'LOCAL',
              expiresIn: 900,
              method: 'POST',
            }),
          },
        },
        { provide: AuditService, useValue: { append: jest.fn().mockResolvedValue({}) } },
        { provide: ConsentLedgerService, useValue: { hasValidConsent } },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  it('uploads via local storage adapter and logs access', async () => {
    const result = await service.uploadFromBuffer(
      TENANT,
      {
        originalname: 'legal-pack.txt',
        mimetype: 'text/plain',
        size: 12,
        buffer: Buffer.from('legal pilot'),
      },
      {
        entityType: 'PROJECT',
        entityId: 'prj_sunrise',
        docType: 'LEGAL_PACK',
        folder: 'LEGAL',
      },
      'usr_dev_admin',
    );

    expect(result.data.id).toMatch(/^doc_/);
    expect(putObject).toHaveBeenCalled();
    expect(accessLogs.some((l) => l.action === 'UPLOAD')).toBe(true);
  });

  it('deduplicates upload by content hash', async () => {
    const buffer = Buffer.from('same-content');
    const first = await service.uploadFromBuffer(
      TENANT,
      { originalname: 'a.txt', mimetype: 'text/plain', size: 12, buffer },
      { entityType: 'PROJECT', entityId: 'prj_sunrise', docType: 'LEGAL_PACK' },
    );
    const replay = await service.uploadFromBuffer(
      TENANT,
      { originalname: 'b.txt', mimetype: 'text/plain', size: 12, buffer },
      { entityType: 'PROJECT', entityId: 'prj_sunrise', docType: 'LEGAL_PACK' },
    );
    expect(replay.meta?.idempotentReplay).toBe(true);
    expect(replay.data.id).toBe(first.data.id);
  });

  it('blocks sensitive download when hasValidConsent is false', async () => {
    hasValidConsent.mockResolvedValue(false);
    documents.push({
      id: 'doc_legal',
      tenantId: TENANT,
      entityType: 'PROJECT',
      entityId: 'prj_sunrise',
      folder: 'LEGAL',
      docType: 'LEGAL_PACK',
      fileName: 'legal.txt',
      mimeType: 'text/plain',
      sizeBytes: 5,
      contentHash: 'abc',
      storageKey: 'legal/key',
      storageProvider: 'LOCAL',
      watermarkEnabled: false,
      scanStatus: 'CLEAN',
      retentionClass: '5Y',
      version: 1,
      createdBy: 'usr_dev_admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.openDownloadStream(TENANT, 'doc_legal', 'usr_dev_admin'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(getObjectStream).not.toHaveBeenCalled();
  });
});
