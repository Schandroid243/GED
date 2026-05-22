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
var LocalStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
let LocalStorageService = LocalStorageService_1 = class LocalStorageService {
    config;
    logger = new common_1.Logger(LocalStorageService_1.name);
    root;
    archive;
    publicUrl;
    constructor(config) {
        this.config = config;
        this.root = config.get('LOCAL_STORAGE_ROOT');
        this.archive = config.get('LOCAL_STORAGE_ARCHIVE');
        this.publicUrl = config.get('LOCAL_STORAGE_PUBLIC_URL');
    }
    async onModuleInit() {
        await fs.mkdir(this.root, { recursive: true });
        await fs.mkdir(this.archive, { recursive: true });
        this.logger.log(`Stockage local initialisé : ${this.root}`);
    }
    async store(tempPath, tenantId, documentId, fileName) {
        const relativePath = path.join('tenants', tenantId, 'documents', documentId, fileName);
        const absolutePath = path.join(this.root, relativePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.copyFile(tempPath, absolutePath);
        const stats = await fs.stat(absolutePath);
        const buffer = await fs.readFile(absolutePath);
        const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
        return {
            absolutePath,
            relativePath,
            publicUrl: `${this.publicUrl}/${relativePath.replace(/\\/g, '/')}`,
            sizeBytes: stats.size,
            checksum,
        };
    }
    async read(relativePath) {
        const absolutePath = path.join(this.root, relativePath);
        return fs.readFile(absolutePath);
    }
    absolutePath(relativePath) {
        return path.join(this.root, relativePath);
    }
    async moveToArchive(relativePath, tenantId, documentId, archiveName) {
        const src = path.join(this.root, relativePath);
        const dest = path.join(this.archive, 'tenants', tenantId, documentId, archiveName);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.rename(src, dest);
        return dest;
    }
    async delete(relativePath) {
        const absolutePath = path.join(this.root, relativePath);
        await fs.unlink(absolutePath).catch(() => {
            this.logger.warn(`Fichier déjà absent : ${absolutePath}`);
        });
    }
    async deleteDocument(tenantId, documentId) {
        const dir = path.join(this.root, 'tenants', tenantId, 'documents', documentId);
        await fs.rm(dir, { recursive: true, force: true });
    }
    async tenantUsage(tenantId) {
        const dir = path.join(this.root, 'tenants', tenantId);
        return this.dirSize(dir);
    }
    async dirSize(dir) {
        let total = 0;
        try {
            for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
                const entryPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    total += await this.dirSize(entryPath);
                }
                else {
                    const stat = await fs.stat(entryPath);
                    total += stat.size;
                }
            }
        }
        catch {
        }
        return total;
    }
};
exports.LocalStorageService = LocalStorageService;
exports.LocalStorageService = LocalStorageService = LocalStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LocalStorageService);
//# sourceMappingURL=storage.service.js.map