import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { WorkflowEngineProcessor } from './workflow-engine.processor';
import { WorkflowEngineService } from './workflow-engine.service';
import { DocumentModule } from '../../documents/document.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.WORKFLOW_ENGINE,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    // Enregistrement des files pour pouvoir y pousser des jobs
    BullModule.registerQueue({ name: QueueName.NOTIFICATION }),
    BullModule.registerQueue({ name: QueueName.WORKFLOW_ENGINE }), // pour jobs différés
    DocumentModule,
  ],
  providers: [WorkflowEngineService, WorkflowEngineProcessor],
})
export class WorkflowEngineModule {}
