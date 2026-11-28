import { HttpException, NotFoundException } from '@nestjs/common';
import { ESIGN_SIGNING_BASE_URL_ENV } from './esign-link.policy';
import { ESIGN_DOWNLOAD_TTL_MS_ENV } from './esign-multi-party';
import { EsignDownloadTicketService, hashDownloadTicket } from './esign-download-ticket.service';

describe('esign download tickets', () => {
  function harness(opts: { ttl?: string; origin?: string } = {}) {
    const saved: Array<{
      tenantId: string;
      ticketHash: string;
      documentId: string;
      expiresAt: Date;
      consumedAt: Date | null;
    }> = [];
    const svc = new EsignDownloadTicketService(
      {
        save: jest.fn(async (row: (typeof saved)[0]) => {
          saved.push(row);
          return row;
        }),
        findOne: jest.fn(async (optsInner: { where: { tenantId: string; ticketHash: string } }) => {
          return (
            saved.find(
              (row) =>
                row.tenantId === optsInner.where.tenantId && row.ticketHash === optsInner.where.ticketHash,
            ) ?? null
          );
        }),
        manager: {
          query: jest.fn(async (_sql: string, params: [string, string]) => {
            const [hash, tenantId] = params;
            const row = saved.find((item) => item.ticketHash === hash && item.tenantId === tenantId);
            if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) return [];
            row.consumedAt = new Date();
            return [{ document_id: row.documentId }];
          }),
        },
      } as never,
      {
        openDownloadStream: jest.fn(async () => ({
          stream: { readable: true },
          row: { mimeType: 'text/plain', fileName: 'signed.txt' },
        })),
      } as never,
      {
        get: (key: string) => {
          if (key === ESIGN_DOWNLOAD_TTL_MS_ENV) return opts.ttl;
          if (key === ESIGN_SIGNING_BASE_URL_ENV) return opts.origin ?? 'https://app.example.test/buyer/esign';
          return undefined;
        },
      } as never,
    );
    return { svc, saved };
  }

  it('does not mint a URL when TTL is empty', async () => {
    const { svc } = harness({ ttl: '' });
    await expect(
      svc.issuePublicUrl({ tenantId: 'ten_b', documentId: 'doc_1', signerId: 'ssgn_1', contractId: 'ctr_b' }),
    ).resolves.toBeNull();
  });

  it('410s an expired ticket, rejects a second use, and 404s the wrong tenant', async () => {
    const { svc, saved } = harness({ ttl: '60000' });
    const url = await svc.issuePublicUrl({
      tenantId: 'ten_b',
      documentId: 'doc_1',
      signerId: 'ssgn_1',
      contractId: 'ctr_b',
    });
    expect(url).toMatch(/^https:\/\/app\.example\.test\/api\/v1\/esign-downloads\/[0-9a-f]{64}$/);
    const ticket = url!.split('/').pop()!;
    expect(saved[0]?.ticketHash).toBe(hashDownloadTicket(ticket));
    expect(JSON.stringify(saved)).not.toContain(ticket);

    await expect(svc.open('ten_b', ticket)).resolves.toMatchObject({ row: { fileName: 'signed.txt' } });
    const reused = await svc.open('ten_b', ticket).catch((error: unknown) => error);
    expect(reused).toBeInstanceOf(HttpException);
    expect((reused as HttpException).getStatus()).toBe(410);

    saved[0]!.consumedAt = null;
    await expect(svc.open('ten_other', ticket)).rejects.toBeInstanceOf(NotFoundException);

    saved[0]!.expiresAt = new Date(Date.now() - 1);
    const expired = await svc.open('ten_b', ticket).catch((error: unknown) => error);
    expect((expired as HttpException).getStatus()).toBe(410);
  });
});
