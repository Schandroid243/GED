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
Object.defineProperty(exports, "__esModule", { value: true });
exports.envValidationSchema = void 0;
const Joi = __importStar(require("joi"));
exports.envValidationSchema = Joi.object({
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').default(''),
    REDIS_DB: Joi.number().default(1),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(3306),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DB_SYNCHRONIZE: Joi.boolean().default(false),
    DB_LOGGING: Joi.boolean().default(false),
    LOCAL_STORAGE_ROOT: Joi.string().required(),
    LOCAL_STORAGE_ARCHIVE: Joi.string().required(),
    LOCAL_STORAGE_PUBLIC_URL: Joi.string().uri().required(),
    OCR_CONCURRENCY: Joi.number().min(1).default(1),
    CLASSIFICATION_CONCURRENCY: Joi.number().min(1).default(4),
    INDEXING_CONCURRENCY: Joi.number().min(1).default(2),
    WORKFLOW_CONCURRENCY: Joi.number().min(1).default(1),
    NOTIFICATION_CONCURRENCY: Joi.number().min(1).default(5),
    ARCHIVE_CONCURRENCY: Joi.number().min(1).default(2),
    INGESTION_CONCURRENCY: Joi.number().min(1).default(2),
    TESSERACT_PATH: Joi.string().default('/usr/bin/tesseract'),
    LIBREOFFICE_PATH: Joi.string().default('/usr/bin/soffice'),
    GHOSTSCRIPT_PATH: Joi.string().default('/usr/bin/gs'),
    CLAMDSCAN_PATH: Joi.string().default('/usr/bin/clamdscan'),
    UPLOAD_TEMP_DIR: Joi.string().default('/tmp/uploads'),
    AGENT_OCR_ENABLED: Joi.boolean().default(true),
    AGENT_ML_CLASSIFICATION: Joi.boolean().default(false),
    AGENT_ARCHIVE_ENABLED: Joi.boolean().default(true),
    BULL_BOARD_USERNAME: Joi.string().default('admin'),
    BULL_BOARD_PASSWORD: Joi.string().required(),
    SLACK_WEBHOOK_URL: Joi.string().uri().allow('').optional(),
    QUEUE_DEPTH_ALERT_THRESHOLD: Joi.number().default(500),
    API_PORT: Joi.number().default(3000),
    API_PREFIX: Joi.string().default('api'),
    CORS_ORIGIN: Joi.string().uri().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('8h'),
});
//# sourceMappingURL=env.validation.js.map