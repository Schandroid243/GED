import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { QueueName } from '../common/queues/queue-names.enum';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  /** GET /api/jobs/queues – Statistiques temps réel des files */
  @Get('queues')
  async getQueueStats() {
    return this.jobsService.getQueueStats();
  }

  /** GET /api/jobs/queues/:name – Jobs d'une file spécifique */
  @Get('queues/:name')
  async getQueueJobs(
    @Param('name') name: string,
    @Query('status') status: string = 'failed',
    @Query('limit') limit: number = 20,
  ) {
    // Valider que le nom est un QueueName valide
    const validNames = Object.values(QueueName);
    if (!validNames.includes(name as QueueName)) {
      throw new BadRequestException(
        `File invalide : ${name}. Valides : ${validNames.join(', ')}`,
      );
    }

    return this.jobsService.getQueueJobs(name as QueueName, status, +limit);
  }

  /** DELETE /api/jobs/queues/:name – Vider une file (admin) */
  @Delete('queues/:name')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async drainQueue(@Param('name') name: string) {
    const validNames = Object.values(QueueName);
    if (!validNames.includes(name as QueueName)) {
      throw new BadRequestException(
        `File invalide : ${name}`,
      );
    }

    await this.jobsService.drainQueue(name as QueueName);
  }
}
