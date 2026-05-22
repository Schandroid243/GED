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
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const storage_service_1 = require("../../storage/storage.service");
const document_service_1 = require("../../documents/document.service");
const document_status_enum_1 = require("../../documents/enums/document-status.enum");
const ocr_result_entity_1 = require("../../documents/entities/ocr-result.entity");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let OcrService = OcrService_1 = class OcrService {
    storageService;
    documentService;
    ocrRepo;
    classificationQueue;
    config;
    logger = new common_1.Logger(OcrService_1.name);
    tesseractPath;
    uploadTempDir;
    constructor(storageService, documentService, ocrRepo, classificationQueue, config) {
        this.storageService = storageService;
        this.documentService = documentService;
        this.ocrRepo = ocrRepo;
        this.classificationQueue = classificationQueue;
        this.config = config;
        this.tesseractPath = config.get('TESSERACT_PATH', '/usr/bin/tesseract');
        this.uploadTempDir = config.get('UPLOAD_TEMP_DIR', '/tmp/uploads');
    }
    async processDocument(data, onProgress) {
        const { documentId, tenantId, filePath, language, correlationId, pageRange } = data;
        onProgress(10);
        const tempDir = path.join(this.uploadTempDir, `ocr-${documentId}`);
        await fs.mkdir(tempDir, { recursive: true });
        const sourceBuffer = await this.storageService.read(filePath);
        const ext = path.extname(filePath) || '.pdf';
        const tempInput = path.join(tempDir, `input${ext}`);
        await fs.writeFile(tempInput, sourceBuffer);
        this.logger.log(`[${correlationId}] Fichier copié vers temp : ${tempInput}`);
        onProgress(30);
        const outputBase = path.join(tempDir, 'output');
        const tesseractArgs = [
            tempInput,
            outputBase,
            '--oem', '3',
            '--psm', '3',
            '-l', language,
            'tsv',
            'hocr',
        ];
        this.logger.log(`[${correlationId}] Lancement Tesseract : ${this.tesseractPath} ${tesseractArgs.join(' ')}`);
        const { stdout, stderr } = await execFileAsync(this.tesseractPath, tesseractArgs, {
            timeout: 300_000,
        });
        if (stderr) {
            this.logger.warn(`[${correlationId}] Tesseract stderr : ${stderr}`);
        }
        onProgress(60);
        const tsvPath = `${outputBase}.tsv`;
        const hocrPath = `${outputBase}.hocr`;
        let pageCount = 0;
        try {
            const tsvContent = await fs.readFile(tsvPath, 'utf-8');
            const hocrContent = await fs.readFile(hocrPath, 'utf-8');
            const lines = tsvContent.split('\n');
            const header = lines[0]?.split('\t') ?? [];
            const pageNumIdx = header.indexOf('page_num');
            const textIdx = header.indexOf('text');
            if (pageNumIdx === -1 || textIdx === -1) {
                throw new non_retriable_error_1.NonRetriableError(`Format TSV inattendu : colonnes page_num/text introuvables`);
            }
            const pagesMap = new Map();
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i]?.split('\t') ?? [];
                const pageNum = parseInt(cols[pageNumIdx] ?? "", 10);
                const text = cols[textIdx]?.trim();
                if (!isNaN(pageNum) && text) {
                    if (!pagesMap.has(pageNum)) {
                        pagesMap.set(pageNum, []);
                    }
                    pagesMap.get(pageNum).push(text);
                }
            }
            pageCount = pagesMap.size;
            const pagesToProcess = pageRange
                ? Array.from(pagesMap.entries()).filter(([num]) => num >= pageRange[0] && num <= pageRange[1])
                : Array.from(pagesMap.entries());
            onProgress(75);
            for (const [pageNum, texts] of pagesToProcess) {
                const rawText = texts.join(' ');
                const ocrEntry = this.ocrRepo.create({
                    documentId,
                    tenantId,
                    pageNumber: pageNum,
                    rawText,
                    hocrData: { raw: hocrContent.slice(0, 5000) },
                    language,
                });
                await this.ocrRepo.save(ocrEntry);
            }
            this.logger.log(`[${correlationId}] ${pageCount} page(s) OCR insérées en base`);
        }
        catch (error) {
            if (error instanceof non_retriable_error_1.NonRetriableError) {
                throw error;
            }
            if (error instanceof Error) {
                this.logger.warn(`[${correlationId}] Erreur parsing OCR : ${error.message}`);
            }
            pageCount = 0;
        }
        onProgress(85);
        const finalStatus = pageCount > 0 ? document_status_enum_1.DocumentStatus.OCR_COMPLETED : document_status_enum_1.DocumentStatus.OCR_PARTIAL;
        await this.documentService.updateStatus(documentId, finalStatus);
        if (pageCount > 0) {
            const allPages = await this.ocrRepo.find({
                where: { documentId },
                order: { pageNumber: 'ASC' },
            });
            const fullText = allPages.map((p) => p.rawText).join('\n');
            const classificationJobData = {
                tenantId,
                documentId,
                ocrText: fullText,
                existingMetadata: {},
                correlationId,
            };
            await this.classificationQueue.add('classify', classificationJobData, {
                jobId: `classify-${documentId}`,
            });
            this.logger.log(`[${correlationId}] Job classification enqueue : classify-${documentId}`);
        }
        onProgress(95);
        await fs.rm(tempDir, { recursive: true, force: true });
        this.logger.log(`[${correlationId}] Temp répertoire nettoyé : ${tempDir}`);
        onProgress(100);
        return { pageCount };
    }
    async handleFailure(data, error) {
        this.logger.error(`[${data.correlationId}] Échec définitif OCR pour ${data.documentId} : ${error.message}`);
        await this.documentService.markError(data.documentId, `OCR échoué : ${error.message}`);
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(ocr_result_entity_1.OcrResult)),
    __param(3, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.CLASSIFICATION)),
    __metadata("design:paramtypes", [storage_service_1.LocalStorageService,
        document_service_1.DocumentService,
        typeorm_2.Repository,
        bullmq_2.Queue,
        config_1.ConfigService])
], OcrService);
//# sourceMappingURL=ocr.service.js.map