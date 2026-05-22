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
var IndexingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexingProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const bullmq_3 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const indexing_service_1 = require("./indexing.service");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
let IndexingProcessor = IndexingProcessor_1 = class IndexingProcessor extends bullmq_3.WorkerHost {
    indexingService;
    config;
    logger = new common_1.Logger(IndexingProcessor_1.name);
    constructor(indexingService, config) {
        super();
        this.indexingService = indexingService;
        this.config = config;
    }
    async process(job) {
        const { documentId, correlationId } = job.data;
        this.logger.log(`[${correlationId}] Indexation démarrée : ${documentId}`);
        try {
            await this.indexingService.indexDocument(job.data, (p) => job.updateProgress(p));
            this.logger.log(`[${correlationId}] Indexation terminée : ${documentId}`);
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                this.logger.error(`[${correlationId}] Erreur non-retriable indexation : ${error.message}`);
                throw error;
            }
            if (error instanceof Error) {
                this.logger.warn(`[${correlationId}] Échec transitoire indexation, retry planifié : ${error.message}`);
            }
            throw error;
        }
    }
    async onFailed(job, error) {
        this.logger.error(`[${job.data.correlationId}] Job indexation ${job.id} échoué définitivement : ${error.message}`);
    }
};
exports.IndexingProcessor = IndexingProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], IndexingProcessor.prototype, "onFailed", null);
exports.IndexingProcessor = IndexingProcessor = IndexingProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_enum_1.QueueName.INDEXING, { concurrency: 2 }),
    __metadata("design:paramtypes", [indexing_service_1.IndexingService,
        config_1.ConfigService])
], IndexingProcessor);
//# sourceMappingURL=indexing.processor.js.map