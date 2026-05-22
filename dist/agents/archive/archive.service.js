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
var ArchiveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchiveService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const document_service_1 = require("../../documents/document.service");
const document_status_enum_1 = require("../../documents/enums/document-status.enum");
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const CONVERTIBLE_MIMES = new Set([
    'application/pdf',
    'image/tiff',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
]);
let ArchiveService = ArchiveService_1 = class ArchiveService {
    documentService;
    archiveQueue;
    config;
    logger = new common_1.Logger(ArchiveService_1.name);
    ghostscriptPath;
    libreofficePath;
    constructor(documentService, archiveQueue, config) {
        this.documentService = documentService;
        this.archiveQueue = archiveQueue;
        this.config = config;
        this.ghostscriptPath = config.get('GHOSTSCRIPT_PATH', '/usr/bin/gs');
        this.libreofficePath = config.get('LIBREOFFICE_PATH', '/usr/bin/soffice');
    }
    async archiveDocuments(data, onProgress) {
        const { documentIds, tenantId, correlationId, signElectronically, archiveProfile } = data;
        const total = documentIds.length;
        for (let i = 0; i < total; i++) {
            const documentId = documentIds[i];
            const progress = Math.round(((i) / total) * 100);
            onProgress(progress);
            try {
                this.logger.log(`[${correlationId}] Archivage document ${i + 1}/${total} : ${documentId}`);
                const doc = await this.documentService.findById(documentId ?? "");
                if (!doc) {
                    this.logger.warn(`[${correlationId}] Document ${documentId} introuvable, ignoré`);
                    continue;
                }
                const relativePath = path.join('tenants', tenantId, 'documents', documentId ?? "", 'original.pdf');
                const tempDir = this.config.get('UPLOAD_TEMP_DIR', '/tmp/uploads');
                const outputPdf = path.join(tempDir, `archive-${documentId ?? ""}.pdf`);
                try {
                    await this.convertToPdfA(relativePath, outputPdf, doc.mimeType ?? 'application/pdf');
                }
                catch (convertErr) {
                    if (convertErr instanceof Error) {
                        this.logger.error(`[${correlationId}] Échec conversion PDF/A pour ${documentId} : ${convertErr.message}`);
                        throw new non_retriable_error_1.NonRetriableError(`Conversion PDF/A impossible pour ${documentId} (${convertErr.message})`);
                    }
                }
                if (signElectronically) {
                    try {
                        if (documentId) {
                            await this.signPades(outputPdf, documentId);
                        }
                    }
                    catch (signErr) {
                        if (signErr instanceof Error) {
                            this.logger.warn(`[${correlationId}] Signature PAdES ignorée pour ${documentId} : ${signErr.message}`);
                        }
                    }
                }
                if (documentId) {
                    const archiveDir = path.join(this.config.get('LOCAL_STORAGE_ARCHIVE', '/var/ged/archive'), 'tenants', tenantId, documentId);
                    await fs.mkdir(archiveDir, { recursive: true });
                    const destPath = path.join(archiveDir, 'archive.pdf');
                    await fs.rename(outputPdf, destPath);
                    this.logger.log(`[${correlationId}] Fichier archivé vers ${destPath}`);
                    await this.documentService.updateStatus(documentId, document_status_enum_1.DocumentStatus.ARCHIVED);
                }
                const retentionMs = this.resolveRetentionMs(archiveProfile);
                if (retentionMs > 0) {
                    await this.archiveQueue.add('destroy', { documentId, tenantId, correlationId }, {
                        delay: retentionMs,
                        jobId: `destroy-${documentId}`,
                    });
                    this.logger.log(`[${correlationId}] Destruction programmée dans ${Math.round(retentionMs / 86400000)} jours pour ${documentId}`);
                }
            }
            catch (err) {
                if (err instanceof Error) {
                    this.logger.error(`[${correlationId}] Échec archivage document ${documentId} : ${err.message}`);
                }
                throw err;
            }
        }
        onProgress(100);
    }
    async destroyDocument(data, onProgress) {
        const { documentId, tenantId, correlationId } = data;
        this.logger.log(`[${correlationId}] Destruction document ${documentId}`);
        const archiveDir = path.join(this.config.get('LOCAL_STORAGE_ARCHIVE', '/var/ged/archive'), 'tenants', tenantId, documentId);
        await fs.rm(archiveDir, { recursive: true, force: true });
        this.logger.log(`[${correlationId}] Fichier archive supprimé : ${archiveDir}`);
        onProgress(100);
    }
    async performCleanup() {
        const tempDir = this.config.get('UPLOAD_TEMP_DIR', '/tmp/uploads');
        try {
            const files = await fs.readdir(tempDir);
            const now = Date.now();
            const maxAge = 24 * 3600 * 1000;
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                try {
                    const stat = await fs.stat(filePath);
                    if (now - stat.mtimeMs > maxAge) {
                        await fs.unlink(filePath);
                        this.logger.debug(`Fichier temporaire nettoyé : ${filePath}`);
                    }
                }
                catch {
                }
            }
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.warn(`Impossible de nettoyer ${tempDir} : ${err.message}`);
            }
        }
        this.logger.log('Nettoyage périodique terminé');
    }
    async convertToPdfA(inputRelativePath, outputPath, mimeType) {
        if (!CONVERTIBLE_MIMES.has(mimeType)) {
            throw new non_retriable_error_1.NonRetriableError(`Type MIME non convertible en PDF/A : ${mimeType}`);
        }
        const storageRoot = this.config.get('LOCAL_STORAGE_ROOT', '/var/ged/storage');
        const inputPath = path.join(storageRoot, inputRelativePath);
        try {
            await fs.access(inputPath);
        }
        catch {
            throw new non_retriable_error_1.NonRetriableError(`Fichier source introuvable : ${inputPath}`);
        }
        if (mimeType === 'application/pdf') {
            try {
                await execFileAsync(this.ghostscriptPath, [
                    '-dPDFA',
                    '-dPDFACompatibilityPolicy=1',
                    '-dNOPAUSE',
                    '-dBATCH',
                    '-sDEVICE=pdfwrite',
                    '-sOutputFile=' + outputPath,
                    inputPath,
                ], { timeout: 120_000 });
            }
            catch (gsErr) {
                if (gsErr instanceof non_retriable_error_1.NonRetriableError) {
                    throw new non_retriable_error_1.NonRetriableError(`Ghostscript a échoué pour ${inputPath} : ${gsErr.message}`);
                }
            }
        }
        else {
            try {
                const tempDir = path.dirname(outputPath);
                await execFileAsync(this.libreofficePath, [
                    '--headless',
                    '--convert-to', 'pdf',
                    '--outdir', tempDir,
                    inputPath,
                ], { timeout: 120_000 });
                const generatedPdf = path.join(tempDir, path.basename(inputPath, path.extname(inputPath)) + '.pdf');
                await fs.rename(generatedPdf, outputPath);
            }
            catch (loErr) {
                if (loErr instanceof non_retriable_error_1.NonRetriableError) {
                    throw new non_retriable_error_1.NonRetriableError(`LibreOffice a échoué pour ${inputPath} : ${loErr.message}`);
                }
            }
        }
    }
    async signPades(pdfPath, documentId) {
        this.logger.log(`Signature PAdES simulée pour ${documentId} (${pdfPath})`);
    }
    resolveRetentionMs(archiveProfile) {
        return 365 * 24 * 3600 * 1000;
    }
};
exports.ArchiveService = ArchiveService;
exports.ArchiveService = ArchiveService = ArchiveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.ARCHIVE)),
    __metadata("design:paramtypes", [document_service_1.DocumentService,
        bullmq_2.Queue,
        config_1.ConfigService])
], ArchiveService);
//# sourceMappingURL=archive.service.js.map