import { BullModule } from '@nestjs/bullmq';
import { QueueName } from './queue-names.enum';

/**
 * Enregistrement centralisé de toutes les files BullMQ.
 * Utilisé par le module racine AgentsModule pour éviter les doublons.
 */
export const AllQueues = BullModule.registerQueue(
  { name: QueueName.DOCUMENT_INGESTION },
  { name: QueueName.OCR_EXTRACTION },
  { name: QueueName.CLASSIFICATION },
  { name: QueueName.INDEXING },
  { name: QueueName.WORKFLOW_ENGINE },
  { name: QueueName.NOTIFICATION },
  { name: QueueName.ARCHIVE },
  { name: QueueName.DEAD_LETTER },
);
