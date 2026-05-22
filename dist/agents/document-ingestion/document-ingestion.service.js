"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentIngestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentIngestionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const storage_service_1 = require("../../storage/storage.service");
const document_service_1 = require("../../documents/document.service");
const document_status_enum_1 = require("../../documents/enums/document-status.enum");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const OCR_MIME_TYPES = new Set([
    'application/pdf',
    'image/tiff',
    'image/png',
    'image/jpeg',
    'image/bmp',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
let DocumentIngestionService = DocumentIngestionService_1 = class DocumentIngestionService {
    storageService;
    documentService;
    ocrQueue;
    config;
    logger = new common_1.Logger(DocumentIngestionService_1.name);
    clamdscanPath;
    uploadTempDir;
    constructor(storageService, documentService, ocrQueue, config) {
        this.storageService = storageService;
        this.documentService = documentService;
        this.ocrQueue = ocrQueue;
        this.config = config;
        this.clamdscanPath = config.get('CLAMDSCAN_PATH', '/usr/bin/clamdscan');
        this.uploadTempDir = config.get('UPLOAD_TEMP_DIR', '/tmp/uploads');
    }
    async run(data, onProgress) {
        const { documentId, tenantId, filePath, mimeType, originalName, correlationId } = data;
        this.logger.log(`[${correlationId}] Analyse antivirus : ${filePath}`);
        onProgress(10);
        await this.scanFile(filePath);
        this.logger.log(`[${correlationId}] Copie vers stockage permanent`);
        onProgress(30);
        const fileName = `original${path.extname(originalName) || '.bin'}`;
        const storedFile = await this.storageService.store(filePath, tenantId, documentId, fileName);
        this.logger.log(`[${correlationId}] Fichier stocké : ${storedFile.relativePath} (${storedFile.sizeBytes} o)`);
        if (storedFile.sizeBytes > MAX_FILE_SIZE) {
            throw new non_retriable_error_1.NonRetriableError(`Fichier trop volumineux : ${storedFile.sizeBytes} o (max: ${MAX_FILE_SIZE} o)`);
        }
        onProgress(50);
        try {
            await this.generateThumbnail(storedFile.absolutePath, tenantId, documentId, mimeType);
            this.logger.log(`[${correlationId}] Miniature générée`);
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.warn(`[${correlationId}] Échec génération miniature : ${err.message}`);
            }
        }
        onProgress(70);
        await this.documentService.updateStatus(documentId, document_status_enum_1.DocumentStatus.RECEIVED);
        onProgress(85);
        if (OCR_MIME_TYPES.has(mimeType)) {
            const ocrJobData = {
                tenantId,
                documentId,
                filePath: storedFile.relativePath,
                language: 'fra',
                correlationId,
                priority: 2,
            };
            await this.ocrQueue.add('extract', ocrJobData, {
                jobId: `ocr-${documentId}`,
                priority: 2,
            });
            this.logger.log(`[${correlationId}] Job OCR enqueue : ocr-${documentId}`);
        }
        else {
            this.logger.log(`[${correlationId}] MIME ${mimeType} non éligible OCR, skip`);
        }
        onProgress(100);
    }
    async scanFile(filePath) {
        try {
            const { stdout } = await execFileAsync(this.clamdscanPath, ['--no-summary', filePath]);
            const output = stdout.trim().toLowerCase();
            if (!output.includes('ok')) {
                throw new non_retriable_error_1.NonRetriableError(`Virus détecté ou analyse impossible : ${stdout.trim()}`);
            }
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                throw error;
            }
            if (error instanceof Error) {
                this.logger.warn(`Analyse antivirus indisponible (clamdscan) : ${error.message}`);
            }
        }
    }
    async generateThumbnail(absolutePath, tenantId, documentId, mimeType) {
        this.logger.debug(`Génération miniature non implémentée pour ${absolutePath}`);
    }
    async markDocumentError(documentId, reason) {
        await this.documentService.markError(documentId, reason);
    }
};
exports.DocumentIngestionService = DocumentIngestionService;
exports.DocumentIngestionService = DocumentIngestionService = DocumentIngestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.OCR_EXTRACTION)),
    __metadata("design:paramtypes", [storage_service_1.LocalStorageService,
        document_service_1.DocumentService,
        bullmq_2.Queue,
        config_1.ConfigService])
], DocumentIngestionService);
//# sourceMappingURL=document-ingestion.service.js.map