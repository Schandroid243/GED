"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DocumentIngestionProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentIngestionProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const config_1 = require("@nestjs/config");
const bullmq_3 = require("@nestjs/bullmq");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const document_ingestion_service_1 = require("./document-ingestion.service");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
let DocumentIngestionProcessor = DocumentIngestionProcessor_1 = class DocumentIngestionProcessor extends bullmq_3.WorkerHost {
    ingestionService;
    config;
    logger = new common_1.Logger(DocumentIngestionProcessor_1.name);
    constructor(ingestionService, config) {
        super();
        this.ingestionService = ingestionService;
        this.config = config;
    }
    async process(job) {
        const { documentId, tenantId, correlationId } = job.data;
        this.logger.log(`[${correlationId}] Ingestion démarrée : ${documentId} (tenant: ${tenantId})`);
        try {
            await this.ingestionService.run(job.data, (p) => job.updateProgress(p));
            this.logger.log(`[${correlationId}] Ingestion terminée : ${documentId}`);
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                this.logger.error(`[${correlationId}] Erreur non-retriable : ${error.message}`);
                throw error;
            }
            this.logger.warn(`[${correlationId}] Échec transitoire, retry planifié : ${error.message}`);
            throw error;
        }
    }
    async onFailed(job, error) {
        this.logger.error(`[${job.data.correlationId}] Job ${job.id} échoué définitivement : ${error.message}`);
        await this.ingestionService.markDocumentError(job.data.documentId, error.message);
    }
};
exports.DocumentIngestionProcessor = DocumentIngestionProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], DocumentIngestionProcessor.prototype, "onFailed", null);
exports.DocumentIngestionProcessor = DocumentIngestionProcessor = DocumentIngestionProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_enum_1.QueueName.DOCUMENT_INGESTION, { concurrency: 2 }),
    __metadata("design:paramtypes", [document_ingestion_service_1.DocumentIngestionService,
        config_1.ConfigService])
], DocumentIngestionProcessor);
//# sourceMappingURL=document-ingestion.processor.js.map