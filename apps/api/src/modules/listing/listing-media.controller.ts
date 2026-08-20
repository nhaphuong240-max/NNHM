import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { ListingMediaService } from './listing-media.service';
import type { AttachListingMediaInput, PresignListingMediaInput, ReorderListingMediaInput } from './listing-media.types';

@Controller('listings/:listingId/media')
export class ListingMediaController {
  constructor(
    private readonly media: ListingMediaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
  ) {
    return this.media.list(resolveTenantId(this.config, user, tenantHeader), listingId);
  }

  @Post('presign')
  @HttpCode(200)
  presign(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @Body() body: PresignListingMediaInput,
  ) {
    return this.media.presign(resolveTenantId(this.config, user, tenantHeader), listingId, body);
  }

  @Post('attach')
  @HttpCode(201)
  attach(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @Body() body: AttachListingMediaInput,
  ) {
    return this.media.attachFromPresign(
      resolveTenantId(this.config, user, tenantHeader),
      listingId,
      body,
      user?.userId,
    );
  }

  @Post('upload')
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException({ detail: 'file is required' });
    return this.media.upload(
      resolveTenantId(this.config, user, tenantHeader),
      listingId,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      user?.userId,
    );
  }

  @Patch('reorder')
  reorder(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @Body() body: ReorderListingMediaInput,
  ) {
    return this.media.reorder(resolveTenantId(this.config, user, tenantHeader), listingId, body);
  }

  @Patch(':mediaId/cover')
  setCover(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.media.setCover(
      resolveTenantId(this.config, user, tenantHeader),
      listingId,
      mediaId,
      user?.userId,
    );
  }

  @Post(':mediaId/scan')
  @HttpCode(200)
  runScan(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.media.runScan(
      resolveTenantId(this.config, user, tenantHeader),
      listingId,
      mediaId,
      user?.userId,
    );
  }

  @Get(':mediaId/file')
  async downloadFile(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @Param('mediaId') mediaId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenantId = resolveTenantId(this.config, user, tenantHeader);
    const { row, target } = await this.media.getFileStream(tenantId, listingId, mediaId);
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${row.fileName}"`);
    return new StreamableFile(createReadStream(target));
  }

  @Delete(':mediaId')
  deleteMedia(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('listingId') listingId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.media.deleteMedia(
      resolveTenantId(this.config, user, tenantHeader),
      listingId,
      mediaId,
      user?.userId,
    );
  }
}
