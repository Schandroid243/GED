import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtValidatedUser } from '../auth/strategies/jwt.strategy';

import { TenantService } from './tenant.service';
import { UsersService } from '../users/users.service';
import { DocumentsService } from '../documents/documents.service';
import { LocalStorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  private readonly logger = new Logger(TenantsController.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly usersService: UsersService,
    private readonly documentsService: DocumentsService,
    private readonly storageService: LocalStorageService,
    private readonly jobsService: JobsService,
  ) {}

  /** GET /api/tenants/profile – Infos du tenant courant */
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtValidatedUser) {
    const config = await this.tenantService.getConfig(user.tenantId);
    const userCount = await this.usersService.countByTenant(user.tenantId);
    const storageUsed = await this.storageService.tenantUsage(user.tenantId);

    return {
      ...config,
      userCount,
      storageUsed,
    };
  }

  /** GET /api/tenants/stats – Dashboard KPI du tenant */
  @Get('stats')
  async getStats(@CurrentUser() user: JwtValidatedUser) {
    const kpi = await this.documentsService.getKpiStats(user.tenantId);
    const jobsWaiting = await this.jobsService.getTotalJobsWaiting();

    return {
      ...kpi,
      jobsWaiting,
    };
  }

  /** PATCH /api/tenants/settings – Mettre à jour les préférences tenant */
  @Patch('settings')
  @Roles(UserRole.OWNER)
  async updateSettings(
    @Body() settings: Record<string, unknown>,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    // TODO: Implémenter la persistance des settings tenant
    this.logger.log(`Settings mis à jour pour tenant ${user.tenantId} : ${JSON.stringify(settings)}`);
    return { message: 'Paramètres mis à jour', settings };
  }
}
