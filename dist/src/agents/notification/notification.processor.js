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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const bullmq_3 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const bullmq_4 = require("@nestjs/bullmq");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const notification_service_1 = require("./notification.service");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor extends bullmq_3.WorkerHost {
    notificationService;
    deadLetterQueue;
    config;
    logger = new common_1.Logger(NotificationProcessor_1.name);
    constructor(notificationService, deadLetterQueue, config) {
        super();
        this.notificationService = notificationService;
        this.deadLetterQueue = deadLetterQueue;
        this.config = config;
    }
    async process(job) {
        const { correlationId, templateName, userIds } = job.data;
        this.logger.log(`[${correlationId}] Notification démarrée : template=${templateName} destinataires=${userIds.length}`);
        try {
            await this.notificationService.send(job.data, (p) => job.updateProgress(p));
            this.logger.log(`[${correlationId}] Notification terminée : template=${templateName}`);
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                this.logger.error(`[${correlationId}] Erreur non-retriable notification : ${error.message}`);
                throw error;
            }
            if (error instanceof Error) {
                this.logger.warn(`[${correlationId}] Échec transitoire notification, retry planifié : ${error.message}`);
            }
            throw error;
        }
    }
    async onFailed(job, error) {
        const maxAttempts = job.opts.attempts ?? 3;
        if (job.attemptsMade >= maxAttempts) {
            this.logger.error(`[${job.data.correlationId}] Notification ${job.id} envoyée vers DEAD_LETTER après ${job.attemptsMade} tentative(s) : ${error.message}`);
            await this.deadLetterQueue.add('failed-notification', {
                originalQueue: queue_names_enum_1.QueueName.NOTIFICATION,
                jobId: job.id,
                data: job.data,
                error: error.message,
                failedAt: new Date().toISOString(),
            });
            this.logger.log(`[${job.data.correlationId}] Job ${job.id} déposé dans DEAD_LETTER`);
        }
        else {
            this.logger.warn(`[${job.data.correlationId}] Notification ${job.id} échouée (${job.attemptsMade}/${maxAttempts}) : ${error.message}`);
        }
    }
};
exports.NotificationProcessor = NotificationProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", Promise)
], NotificationProcessor.prototype, "onFailed", null);
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_enum_1.QueueName.NOTIFICATION, { concurrency: 5 }),
    __param(1, (0, bullmq_4.InjectQueue)(queue_names_enum_1.QueueName.DEAD_LETTER)),
    __metadata("design:paramtypes", [notification_service_1.NotificationService,
        bullmq_2.Queue,
        config_1.ConfigService])
], NotificationProcessor);
//# sourceMappingURL=notification.processor.js.map