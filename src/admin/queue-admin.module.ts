import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { createBullBoard } from '@bull-board/api';
import { QueueName } from '../common/queues/queue-names.enum';

// Middleware BasicAuth simple pour protéger le dashboard
import * as basicAuth from 'express-basic-auth';

/**
 * Module qui expose le tableau de bord Bull Board sur /admin/queues.
 * Protégé par BasicAuth utilisant BULL_BOARD_USERNAME / BULL_BOARD_PASSWORD.
 */
@Module({})
export class QueueAdminModule implements NestModule {
  constructor(
    @InjectQueue(QueueName.DOCUMENT_INGESTION) private readonly q1: Queue,
    @InjectQueue(QueueName.OCR_EXTRACTION)     private readonly q2: Queue,
    @InjectQueue(QueueName.CLASSIFICATION)     private readonly q3: Queue,
    @InjectQueue(QueueName.INDEXING)           private readonly q4: Queue,
    @InjectQueue(QueueName.WORKFLOW_ENGINE)    private readonly q5: Queue,
    @InjectQueue(QueueName.NOTIFICATION)       private readonly q6: Queue,
    @InjectQueue(QueueName.ARCHIVE)            private readonly q7: Queue,
    @InjectQueue(QueueName.DEAD_LETTER)        private readonly q8: Queue,
    private readonly config: ConfigService,
  ) {}

  configure(consumer: MiddlewareConsumer): void {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [
        this.q1, this.q2, this.q3, this.q4,
        this.q5, this.q6, this.q7, this.q8,
      ].map((q) => new BullMQAdapter(q)),
      serverAdapter,
    });

    // BasicAuth middleware
    const username = this.config.get<string>('BULL_BOARD_USERNAME', 'admin');
    const password = this.config.get<string>('BULL_BOARD_PASSWORD', 'changeme');

    consumer
      .apply(
        basicAuth({
          users: { [username]: password },
          challenge: true,
          realm: 'BullBoard Admin',
        }),
        serverAdapter.getRouter(),
      )
      .forRoutes('/admin/queues');
  }
}
