import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveTenantId } from '../../common/resolve-tenant-id';
import type { UnitEntity } from '../../database/entities/unit.entity';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { AuthUser } from '../identity/identity.types';
import { GoldenRecordService } from './golden-record.service';
import type { CreateProjectInput, UpdateProjectInput } from './golden-record.types';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly gr: GoldenRecordService,
    private readonly config: ConfigService,
  ) {}

  /** API-014 — list tenant projects (Golden Record) */
  @Get()
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    return this.gr.listProjects(resolveTenantId(this.config, user, tenantHeader));
  }

  /** API-015 — create project (Developer Admin) */
  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Body() body: CreateProjectInput,
  ) {
    return this.gr.createProject(
      resolveTenantId(this.config, user, tenantHeader),
      body,
      user.role,
      user.userId,
    );
  }

  /** API-016 — project detail */
  @Get(':projectId')
  getOne(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.gr.getProject(resolveTenantId(this.config, user, tenantHeader), projectId.trim());
  }

  /** API-017 — update project (Developer Admin) */
  @Patch(':projectId')
  update(
    @CurrentUser() user: AuthUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectInput,
  ) {
    return this.gr.updateProject(
      resolveTenantId(this.config, user, tenantHeader),
      projectId.trim(),
      body,
      user.role,
      user.userId,
    );
  }

  /** API-018 — delete project (Developer Admin, no units) */
  @Delete(':projectId')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthUser,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    await this.gr.deleteProject(
      resolveTenantId(this.config, user, tenantHeader),
      projectId.trim(),
      user.role,
      user.userId,
    );
  }

  /** UC-GR-04 — Product Graph: Project → Building → Floor → Unit */
  @Get(':projectId/graph')
  graph(
    @CurrentUser() user: AuthUser | undefined,
    @Headers('x-tenant-id') tenantHeader: string | undefined,
    @Param('projectId') projectId: string,
    @Query('building') building?: string,
    @Query('status') status?: UnitEntity['status'],
    @Query('minPrice') minPriceRaw?: string,
    @Query('maxPrice') maxPriceRaw?: string,
  ) {
    const minPrice = minPriceRaw ? Number.parseInt(minPriceRaw, 10) : undefined;
    const maxPrice = maxPriceRaw ? Number.parseInt(maxPriceRaw, 10) : undefined;

    return this.gr.getProductGraph(resolveTenantId(this.config, user, tenantHeader), projectId.trim(), {
      building: building?.trim() || undefined,
      status,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    });
  }
}
