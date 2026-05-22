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
var WorkflowEngineProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngineProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const bullmq_3 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const workflow_engine_service_1 = require("./workflow-engine.service");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
let WorkflowEngineProcessor = WorkflowEngineProcessor_1 = class WorkflowEngineProcessor extends bullmq_3.WorkerHost {
    workflowEngineService;
    config;
    logger = new common_1.Logger(WorkflowEngineProcessor_1.name);
    constructor(workflowEngineService, config) {
        super();
        this.workflowEngineService = workflowEngineService;
        this.config = config;
    }
    async process(job) {
        const { documentId, eventType, correlationId } = job.data;
        this.logger.log(`[${correlationId}] Événement workflow reçu : ${eventType} pour ${documentId}`);
        try {
            await this.workflowEngineService.processEvent(job.data, (p) => job.updateProgress(p));
            this.logger.log(`[${correlationId}] Événement workflow traité : ${eventType} pour ${documentId}`);
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                this.logger.error(`[${correlationId}] Erreur non-retriable workflow : ${error.message}`);
                throw error;
            }
            if (error instanceof Error) {
                this.logger.warn(`[${correlationId}] Échec transitoire workflow, retry planifié : ${error.message}`);
            }
            throw error;
        }
    }
    async onFailed(job, error) {
        this.logger.error(`[${job.data.correlationId}] Job workflow ${job.id} échoué définitivement : ${error.message}` +
            ` | eventType=${job.data.eventType} documentId=${job.data.documentId}`);
    }
};
exports.WorkflowEngineProcessor = WorkflowEngineProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], WorkflowEngineProcessor.prototype, "onFailed", null);
exports.WorkflowEngineProcessor = WorkflowEngineProcessor = WorkflowEngineProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_enum_1.QueueName.WORKFLOW_ENGINE, { concurrency: 1 }),
    __metadata("design:paramtypes", [workflow_engine_service_1.WorkflowEngineService,
        config_1.ConfigService])
], WorkflowEngineProcessor);
//# sourceMappingURL=workflow-engine.processor.js.map