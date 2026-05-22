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
var WorkflowEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngineService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const document_service_1 = require("../../documents/document.service");
const document_status_enum_1 = require("../../documents/enums/document-status.enum");
const DEFAULT_WORKFLOW_DEFINITION = [
    {
        fromStatus: document_status_enum_1.DocumentStatus.RECEIVED,
        eventType: 'DOCUMENT_CLASSIFIED',
        toStatus: document_status_enum_1.DocumentStatus.CLASSIFIED,
        actions: [
            { type: 'UPDATE_STATUS' },
            { type: 'NOTIFY', templateName: 'document_classified' },
        ],
    },
    {
        fromStatus: document_status_enum_1.DocumentStatus.CLASSIFIED,
        eventType: 'ARCHIVE_TRIGGERED',
        toStatus: document_status_enum_1.DocumentStatus.ARCHIVED,
        actions: [
            { type: 'UPDATE_STATUS' },
            { type: 'NOTIFY', templateName: 'document_archived' },
        ],
    },
];
let WorkflowEngineService = WorkflowEngineService_1 = class WorkflowEngineService {
    documentService;
    notificationQueue;
    workflowQueue;
    config;
    logger = new common_1.Logger(WorkflowEngineService_1.name);
    constructor(documentService, notificationQueue, workflowQueue, config) {
        this.documentService = documentService;
        this.notificationQueue = notificationQueue;
        this.workflowQueue = workflowQueue;
        this.config = config;
    }
    async processEvent(data, onProgress) {
        const { documentId, tenantId, eventType, correlationId, context } = data;
        onProgress(20);
        const workflowDefinition = await this.loadWorkflowDefinition(tenantId);
        this.logger.debug(`[${correlationId}] Définition workflow chargée : ${workflowDefinition.length} transitions`);
        onProgress(40);
        const matchingTransitions = workflowDefinition.filter((t) => t.eventType === eventType);
        if (matchingTransitions.length === 0) {
            this.logger.log(`[${correlationId}] Aucune transition trouvée pour eventType=${eventType} sur ${documentId}`);
            onProgress(100);
            return;
        }
        onProgress(60);
        for (const transition of matchingTransitions) {
            this.logger.log(`[${correlationId}] Transition appliquée : ${transition.fromStatus} → ${transition.toStatus} (${eventType})`);
            for (const action of transition.actions) {
                await this.executeAction(action, {
                    documentId,
                    tenantId,
                    correlationId,
                    newStatus: transition.toStatus,
                    ...(context && { context }),
                });
            }
            if (!transition.actions.some((a) => a.type === 'UPDATE_STATUS')) {
                await this.documentService.updateStatus(documentId, transition.toStatus);
            }
            await this.persistHistory({
                documentId,
                tenantId,
                eventType,
                fromStatus: transition.fromStatus,
                toStatus: transition.toStatus,
                correlationId,
            });
        }
        onProgress(100);
    }
    async executeAction(action, ctx) {
        switch (action.type) {
            case 'NOTIFY': {
                const notificationData = {
                    tenantId: ctx.tenantId,
                    userIds: action.userIds ?? [],
                    channels: ['inapp'],
                    templateName: action.templateName,
                    data: {
                        documentId: ctx.documentId,
                        newStatus: ctx.newStatus,
                        ...ctx.context,
                    },
                    correlationId: ctx.correlationId,
                };
                await this.notificationQueue.add('send', notificationData, {
                    jobId: `notify-${ctx.documentId}-${action.templateName}-${Date.now()}`,
                });
                this.logger.debug(`[${ctx.correlationId}] Action NOTIFY : ${action.templateName}`);
                break;
            }
            case 'SCHEDULE_TIMEOUT': {
                if (action.eventOnTimeout && action.delayMs) {
                    const timeoutData = {
                        tenantId: ctx.tenantId,
                        documentId: ctx.documentId,
                        eventType: action.eventOnTimeout,
                        correlationId: ctx.correlationId,
                        ...(ctx.context && { context: ctx.context }),
                    };
                    await this.workflowQueue.add('event', timeoutData, {
                        delay: action.delayMs,
                        jobId: `timeout-${ctx.documentId}-${action.eventOnTimeout}`,
                    });
                    this.logger.debug(`[${ctx.correlationId}] Action SCHEDULE_TIMEOUT : ${action.delayMs}ms → ${action.eventOnTimeout}`);
                }
                break;
            }
            case 'UPDATE_STATUS': {
                await this.documentService.updateStatus(ctx.documentId, ctx.newStatus);
                this.logger.debug(`[${ctx.correlationId}] Action UPDATE_STATUS : ${ctx.newStatus}`);
                break;
            }
            case 'LOG':
            default: {
                this.logger.log(`[${ctx.correlationId}] Action LOG : document ${ctx.documentId} transition vers ${ctx.newStatus}`);
                break;
            }
        }
    }
    async loadWorkflowDefinition(tenantId) {
        return DEFAULT_WORKFLOW_DEFINITION;
    }
    async persistHistory(entry) {
        this.logger.debug(`[${entry.correlationId}] Historique workflow : ${entry.documentId} ` +
            `${entry.fromStatus} → ${entry.toStatus} (${entry.eventType})`);
    }
};
exports.WorkflowEngineService = WorkflowEngineService;
exports.WorkflowEngineService = WorkflowEngineService = WorkflowEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.NOTIFICATION)),
    __param(2, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.WORKFLOW_ENGINE)),
    __metadata("design:paramtypes", [document_service_1.DocumentService,
        bullmq_2.Queue,
        bullmq_2.Queue,
        config_1.ConfigService])
], WorkflowEngineService);
//# sourceMappingURL=workflow-engine.service.js.map