"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllQueues = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const queue_names_enum_1 = require("./queue-names.enum");
exports.AllQueues = bullmq_1.BullModule.registerQueue({ name: queue_names_enum_1.QueueName.DOCUMENT_INGESTION }, { name: queue_names_enum_1.QueueName.OCR_EXTRACTION }, { name: queue_names_enum_1.QueueName.CLASSIFICATION }, { name: queue_names_enum_1.QueueName.INDEXING }, { name: queue_names_enum_1.QueueName.WORKFLOW_ENGINE }, { name: queue_names_enum_1.QueueName.NOTIFICATION }, { name: queue_names_enum_1.QueueName.ARCHIVE }, { name: queue_names_enum_1.QueueName.DEAD_LETTER });
//# sourceMappingURL=all-queues.provider.js.map