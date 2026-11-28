import { Controller, Get, Headers, Header, Param, Res, StreamableFile } from '@nestjs/common';
import type { Readable } from 'stream';
import type { Response } from 'express';
import { Public } from '../identity/decorators/public.decorator';
import { EsignDownloadTicketService } from './esign-download-ticket.service';

@Public()
@Controller('esign-downloads')
export class EsignDownloadController {
  constructor(private readonly downloads: EsignDownloadTicketService) {}

  @Get(':ticket')
  @Header('Referrer-Policy', 'no-referrer')
  async download(
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('ticket') ticket: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, row } = await this.downloads.open(tenantHeader, ticket);
    res.set({
      'Content-Type': row.mimeType,
      'Content-Disposition': `attachment; filename="${row.fileName}"`,
      'Referrer-Policy': 'no-referrer',
    });
    return new StreamableFile(stream as Readable);
  }
}
