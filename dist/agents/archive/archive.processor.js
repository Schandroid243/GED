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
var ArchiveProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchiveProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const bullmq_3 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const archive_service_1 = require("./archive.service");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
let ArchiveProcessor = ArchiveProcessor_1 = class ArchiveProcessor extends bullmq_3.WorkerHost {
    archiveService;
    config;
    logger = new common_1.Logger(ArchiveProcessor_1.name);
    constructor(archiveService, config) {
        super();
        this.archiveService = archiveService;
        this.config = config;
    }
    async process(job) {
        const jobData = job.data;
        if ('documentIds' in jobData && Array.isArray(jobData.documentIds)) {
            return this.handleBatchArchive(job);
        }
        else if ('documentId' in jobData && 'tenantId' in jobData && !('documentIds' in jobData)) {
            return this.handleDestroy(job);
        }
        else {
            return this.handleCleanup(job);
        }
    }
    async handleBatchArchive(job) {
        const { documentIds, correlationId, tenantId } = job.data;
        this.logger.log(`[${correlationId}] Archivage batch démarré : ${documentIds.length} document(s) pour tenant=${tenantId}`);
        try {
            await this.archiveService.archiveDocuments(job.data, (p) => job.updateProgress(p));
            this.logger.log(`[${correlationId}] Archivage batch terminé : ${documentIds.length} document(s)`);
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                this.logger.error(`[${correlationId}] Erreur non-retriable archivage batch : ${error.message}`);
                throw error;
            }
            if (error instanceof Error) {
                this.logger.warn(`[${correlationId}] Échec transitoire archivage batch, retry planifié : ${error.message}`);
            }
            throw error;
        }
    }
    async handleDestroy(job) {
        const { documentId, correlationId } = job.data;
        this.logger.log(`[${correlationId}] Destruction document démarrée : ${documentId}`);
        try {
            await this.archiveService.destroyDocument(job.data, (p) => job.updateProgress(p));
            this.logger.log(`[${correlationId}] Destruction terminée : ${documentId}`);
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                this.logger.error(`[${correlationId}] Erreur non-retriable destruction : ${error.message}`);
                throw error;
            }
            if (error instanceof Error) {
                this.logger.warn(`[${correlationId}] Échec transitoire destruction, retry planifié : ${error.message}`);
            }
            throw error;
        }
    }
    async handleCleanup(job) {
        this.logger.log(`Nettoyage périodique démarré (job ${job.id})`);
        try {
            await this.archiveService.performCleanup();
            this.logger.log('Nettoyage périodique terminé');
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Échec du nettoyage périodique : ${error.message}`);
            }
            throw error;
        }
    }
    async onFailed(job, error) {
        this.logger.error(`[${job.data?.correlationId ?? 'N/A'}] Job archive ${job.id} échoué définitivement : ${error.message}`);
    }
};
exports.ArchiveProcessor = ArchiveProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], ArchiveProcessor.prototype, "onFailed", null);
exports.ArchiveProcessor = ArchiveProcessor = ArchiveProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_enum_1.QueueName.ARCHIVE, { concurrency: 2 }),
    __metadata("design:paramtypes", [archive_service_1.ArchiveService,
        config_1.ConfigService])
], ArchiveProcessor);
//# sourceMappingURL=archive.processor.js.map