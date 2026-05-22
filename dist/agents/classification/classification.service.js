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
var ClassificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const document_service_1 = require("../../documents/document.service");
const document_type_enum_1 = require("../../documents/enums/document-type.enum");
const CLASSIFICATION_RULES = [
    [/facture|invoice|bill|payment|montant|tva|ht\s*total/i, document_type_enum_1.DocumentType.INVOICE],
    [/contrat|contract|agreement|clause|signature|parties/i, document_type_enum_1.DocumentType.CONTRACT],
    [/carte\s*d'identité|passeport|permis|id_card|passport|driver.?license/i, document_type_enum_1.DocumentType.ID_CARD],
    [/reçu|reçu|receipt|ticket|justificatif|paiement|remboursement/i, document_type_enum_1.DocumentType.RECEIPT],
    [/rapport|report|bilan|analyse|analysis|summary|synthèse/i, document_type_enum_1.DocumentType.REPORT],
];
let ClassificationService = ClassificationService_1 = class ClassificationService {
    documentService;
    indexingQueue;
    workflowEngineQueue;
    config;
    logger = new common_1.Logger(ClassificationService_1.name);
    mlClassificationEnabled;
    constructor(documentService, indexingQueue, workflowEngineQueue, config) {
        this.documentService = documentService;
        this.indexingQueue = indexingQueue;
        this.workflowEngineQueue = workflowEngineQueue;
        this.config = config;
        this.mlClassificationEnabled = config.get('AGENT_ML_CLASSIFICATION', false);
    }
    async classify(data, onProgress) {
        const { documentId, tenantId, ocrText, existingMetadata, correlationId } = data;
        onProgress(20);
        let bestMatch = null;
        for (const [regex, docType] of CLASSIFICATION_RULES) {
            const matches = ocrText.match(regex);
            if (matches) {
                const score = this.calculateHeuristicScore(matches, ocrText.length);
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { type: docType, score };
                }
            }
        }
        onProgress(50);
        if (this.mlClassificationEnabled && data.useMlModel) {
            try {
                const mlResult = await this.callMlService(ocrText, existingMetadata);
                if (mlResult.confidence > 0.7) {
                    bestMatch = { type: mlResult.documentType, score: mlResult.confidence };
                }
            }
            catch (err) {
                if (err instanceof Error) {
                    this.logger.warn(`[${correlationId}] Appel ML échoué, fallback heuristique : ${err.message}`);
                }
            }
        }
        onProgress(70);
        const finalType = bestMatch?.type ?? document_type_enum_1.DocumentType.UNKNOWN;
        const confidence = bestMatch?.score ?? 0;
        await this.documentService.updateClassification(documentId, finalType, confidence);
        this.logger.log(`[${correlationId}] Document ${documentId} classifié : ${finalType} (${confidence})`);
        onProgress(85);
        const indexingJobData = {
            tenantId,
            documentId,
            textContent: ocrText,
            metadata: existingMetadata,
            correlationId,
            language: 'fra',
        };
        await this.indexingQueue.add('index', indexingJobData, {
            jobId: `index-${documentId}`,
        });
        this.logger.log(`[${correlationId}] Job indexation enqueue : index-${documentId}`);
        onProgress(95);
        const workflowJobData = {
            tenantId,
            documentId,
            eventType: 'DOCUMENT_CLASSIFIED',
            correlationId,
            context: {
                documentType: finalType,
                confidence,
            },
        };
        await this.workflowEngineQueue.add('event', workflowJobData, {
            jobId: `workflow-${documentId}-classified`,
        });
        this.logger.log(`[${correlationId}] Job workflow enqueue : workflow-${documentId}-classified`);
        onProgress(100);
        return {
            documentType: finalType,
            confidence,
        };
    }
    calculateHeuristicScore(matches, textLength) {
        const matchLength = matches[0].length;
        const baseScore = Math.min(matchLength / textLength, 0.5);
        const occurrenceBonus = Math.min(matches.length * 0.1, 0.3);
        return Math.min(baseScore + occurrenceBonus, 1.0);
    }
    async callMlService(ocrText, metadata) {
        this.logger.debug('Appel ML non implémenté, fallback heuristique');
        throw new Error('Service ML non disponible');
    }
    async classifyAsUnknown(documentId, errorMessage) {
        this.logger.error(`Classification échouée après 3 tentatives, fallback UNKNOWN pour ${documentId} : ${errorMessage}`);
        const doc = await this.documentService.findById(documentId);
        if (!doc) {
            this.logger.warn(`Document ${documentId} introuvable pour fallback classification`);
            return;
        }
        await this.documentService.updateClassification(documentId, document_type_enum_1.DocumentType.UNKNOWN, 0);
    }
};
exports.ClassificationService = ClassificationService;
exports.ClassificationService = ClassificationService = ClassificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.INDEXING)),
    __param(2, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.WORKFLOW_ENGINE)),
    __metadata("design:paramtypes", [document_service_1.DocumentService,
        bullmq_2.Queue,
        bullmq_2.Queue,
        config_1.ConfigService])
], ClassificationService);
//# sourceMappingURL=classification.service.js.map