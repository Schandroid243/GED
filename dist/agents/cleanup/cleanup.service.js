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
var CleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_2 = require("bullmq");
const typeorm_2 = require("typeorm");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const job_record_entity_1 = require("../entities/job-record.entity");
let CleanupService = CleanupService_1 = class CleanupService {
    archiveQueue;
    jobRecordRepo;
    config;
    logger = new common_1.Logger(CleanupService_1.name);
    constructor(archiveQueue, jobRecordRepo, config) {
        this.archiveQueue = archiveQueue;
        this.jobRecordRepo = jobRecordRepo;
        this.config = config;
    }
    async onApplicationBootstrap() {
        try {
            await this.archiveQueue.add('cleanup', {}, {
                repeat: { pattern: '0 */6 * * *' },
                jobId: 'recurring-cleanup',
            });
            this.logger.log('Nettoyage périodique enregistré : toutes les 6h (CRON: 0 */6 * * *)');
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.error(`Impossible d'enregistrer le CRON de nettoyage : ${err.message}`);
            }
        }
    }
    async performCleanup() {
        this.logger.log('Début du nettoyage périodique...');
        await this.cleanupTempFiles();
        await this.purgeOldJobRecords();
        await this.releaseOrphanedLocks();
        this.logger.log('Nettoyage périodique terminé.');
    }
    async cleanupTempFiles() {
        const tempDir = this.config.get('UPLOAD_TEMP_DIR', '/tmp/uploads');
        const maxAgeMs = 24 * 3600 * 1000;
        const now = Date.now();
        let deletedCount = 0;
        try {
            await fs.mkdir(tempDir, { recursive: true });
            const files = await fs.readdir(tempDir);
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                try {
                    const stat = await fs.stat(filePath);
                    if (now - stat.mtimeMs > maxAgeMs) {
                        await fs.unlink(filePath);
                        deletedCount++;
                        this.logger.debug(`Fichier temporaire supprimé : ${filePath}`);
                    }
                }
                catch {
                }
            }
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.warn(`Impossible de nettoyer le répertoire temporaire ${tempDir} : ${err.message}`);
            }
        }
        if (deletedCount > 0) {
            this.logger.log(`${deletedCount} fichier(s) temporaire(s) supprimé(s)`);
        }
    }
    async purgeOldJobRecords() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        try {
            const result = await this.jobRecordRepo.delete({
                status: (0, typeorm_2.In)(['completed', 'failed']),
                createdAt: (0, typeorm_2.LessThan)(thirtyDaysAgo),
            });
            if (result.affected && result.affected > 0) {
                this.logger.log(`${result.affected} enregistrement(s) JobRecord purgé(s) (plus de 30 jours)`);
            }
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.error(`Erreur lors de la purge des JobRecord : ${err.message}`);
            }
        }
    }
    async releaseOrphanedLocks() {
        this.logger.debug('Vérification des verrous Redis orphelins (non implémentée)');
    }
};
exports.CleanupService = CleanupService;
exports.CleanupService = CleanupService = CleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.ARCHIVE)),
    __param(1, (0, typeorm_1.InjectRepository)(job_record_entity_1.JobRecord)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        typeorm_2.Repository,
        config_1.ConfigService])
], CleanupService);
//# sourceMappingURL=cleanup.service.js.map