import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Readable } from 'stream';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { DocumentsService } from './documents.service';
import type { PresignDocumentInput, UploadDocumentInput } from './documents.types';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  status() {
    return this.documents.status();
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('folder') folder?: string,
  ) {
    return this.documents.list(resolveTenantId(this.config, user, tenantHeader), {
      entityType,
      entityId,
      folder,
    });
  }

  @Get(':documentId')
  get(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('documentId') documentId: string,
  ) {
    return this.documents.get(resolveTenantId(this.config, user, tenantHeader), documentId);
  }

  @Post('presign')
  @HttpCode(201)
  presign(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: PresignDocumentInput,
  ) {
    return this.documents.presignUpload(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user?.userId,
    );
  }

  @Post('upload')
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentInput,
  ) {
    if (!file) {
      throw new BadRequestException({ detail: 'multipart field "file" is required' });
    }
    return this.documents.uploadFromBuffer(
      resolveTenantId(this.config, user, tenantHeader),
      file,
      body,
      user?.userId,
    );
  }

  @Get(':documentId/download')
  async download(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('documentId') documentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const { stream, row, meta } = await this.documents.openDownloadStream(
      tenantId,
      documentId,
      user?.userId,
    );

    res.set({
      'Content-Type': row.mimeType,
      'Content-Disposition': `attachment; filename="${row.fileName}"`,
    });
    if (meta.watermarkLabel) {
      res.set('X-WEREAL-Watermark', meta.watermarkLabel);
    }

    return new StreamableFile(stream as Readable);
  }

  @Get(':documentId/access-log')
  accessLog(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('documentId') documentId: string,
  ) {
    return this.documents.listAccessLogs(
      resolveTenantId(this.config, user, tenantHeader),
      documentId,
    );
  }
}
