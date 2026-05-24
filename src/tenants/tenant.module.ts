import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantsController } from './tenants.controller';
import { UsersModule } from '../users/users.module';
import { JobsModule } from '../jobs/jobs.module';
import { DocumentModule } from '../documents/document.module';

@Module({
  imports: [UsersModule, JobsModule, DocumentModule],
  controllers: [TenantsController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
