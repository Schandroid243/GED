"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfigFactory = void 0;
const job_record_entity_1 = require("../agents/entities/job-record.entity");
const document_entity_1 = require("../documents/entities/document.entity");
const ocr_result_entity_1 = require("../documents/entities/ocr-result.entity");
const databaseConfigFactory = (config) => ({
    type: 'mysql',
    host: config.get('DB_HOST') || 'localhost',
    port: config.get('DB_PORT') || 3306,
    username: config.get('DB_USER'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_NAME'),
    entities: [job_record_entity_1.JobRecord, document_entity_1.Document, ocr_result_entity_1.OcrResult],
    synchronize: config.get('DB_SYNCHRONIZE') ?? false,
    logging: config.get('DB_LOGGING') ?? false,
});
exports.databaseConfigFactory = databaseConfigFactory;
//# sourceMappingURL=database.config.js.map