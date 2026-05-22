import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { NotificationProcessor } from './notification.processor';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.NOTIFICATION,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    // Enregistrement de la DEAD_LETTER pour y envoyer les jobs définitivement échoués
    BullModule.registerQueue({ name: QueueName.DEAD_LETTER }),
  ],
  providers: [NotificationService, NotificationProcessor],
})
export class NotificationModule {}
