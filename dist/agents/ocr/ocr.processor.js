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
var OcrProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const config_1 = require("@nestjs/config");
const bullmq_3 = require("@nestjs/bullmq");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const ocr_service_1 = require("./ocr.service");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
let OcrProcessor = OcrProcessor_1 = class OcrProcessor extends bullmq_3.WorkerHost {
    ocrService;
    config;
    logger = new common_1.Logger(OcrProcessor_1.name);
    constructor(ocrService, config) {
        super();
        this.ocrService = ocrService;
        this.config = config;
    }
    async process(job) {
        const { documentId, correlationId } = job.data;
        this.logger.log(`[${correlationId}] OCR démarré : ${documentId}`);
        try {
            const result = await this.ocrService.processDocument(job.data, (p) => job.updateProgress(p));
            this.logger.log(`[${correlationId}] OCR terminé : ${documentId} — ${result.pageCount} page(s)`);
            return result;
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                this.logger.error(`[${correlationId}] Erreur non-retriable OCR : ${error.message}`);
                throw error;
            }
            if (error instanceof Error) {
                this.logger.warn(`[${correlationId}] Échec transitoire OCR, retry planifié : ${error.message}`);
            }
            throw error;
        }
    }
    async onFailed(job, error) {
        this.logger.error(`[${job.data.correlationId}] Job OCR ${job.id} échoué définitivement : ${error.message}`);
        await this.ocrService.handleFailure(job.data, error);
    }
};
exports.OcrProcessor = OcrProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], OcrProcessor.prototype, "onFailed", null);
exports.OcrProcessor = OcrProcessor = OcrProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_enum_1.QueueName.OCR_EXTRACTION, { concurrency: 1 }),
    __metadata("design:paramtypes", [ocr_service_1.OcrService,
        config_1.ConfigService])
], OcrProcessor);
//# sourceMappingURL=ocr.processor.js.map