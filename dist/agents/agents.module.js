"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const env_validation_1 = require("../config/env.validation");
const bull_config_1 = require("../config/bull.config");
const queue_names_enum_1 = require("../common/queues/queue-names.enum");
const document_ingestion_module_1 = require("./document-ingestion/document-ingestion.module");
const ocr_module_1 = require("./ocr/ocr.module");
const classification_module_1 = require("./classification/classification.module");
const indexing_module_1 = require("./indexing/indexing.module");
const workflow_engine_module_1 = require("./workflow-engine/workflow-engine.module");
const notification_module_1 = require("./notification/notification.module");
const archive_module_1 = require("./archive/archive.module");
const cleanup_module_1 = require("./cleanup/cleanup.module");
const document_module_1 = require("../documents/document.module");
const tenant_module_1 = require("../tenants/tenant.module");
const storage_module_1 = require("../storage/storage.module");
const job_record_entity_1 = require("./entities/job-record.entity");
const document_entity_1 = require("../documents/entities/document.entity");
const ocr_result_entity_1 = require("../documents/entities/ocr-result.entity");
const job_lifecycle_listener_1 = require("./listeners/job-lifecycle.listener");
const queue_admin_module_1 = require("../admin/queue-admin.module");
let AgentsModule = class AgentsModule {
};
exports.AgentsModule = AgentsModule;
exports.AgentsModule = AgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env.agents',
                validationSchema: env_validation_1.envValidationSchema,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: 'mysql',
                    host: config.get('DB_HOST'),
                    port: parseInt(config.get('DB_PORT')),
                    username: config.get('DB_USER'),
                    password: config.get('DB_PASSWORD'),
                    database: config.get('DB_NAME'),
                    entities: [job_record_entity_1.JobRecord, document_entity_1.Document, ocr_result_entity_1.OcrResult],
                    synchronize: config.get('DB_SYNCHRONIZE'),
                    logging: config.get('DB_LOGGING') ?? false,
                }),
                inject: [config_1.ConfigService],
            }),
            typeorm_1.TypeOrmModule.forFeature([job_record_entity_1.JobRecord]),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: bull_config_1.bullConfigFactory,
                inject: [config_1.ConfigService],
            }),
            bullmq_1.BullModule.registerQueue({ name: queue_names_enum_1.QueueName.DEAD_LETTER }),
            document_module_1.DocumentModule,
            tenant_module_1.TenantModule,
            storage_module_1.StorageModule,
            document_ingestion_module_1.DocumentIngestionModule,
            ocr_module_1.OcrModule,
            classification_module_1.ClassificationModule,
            indexing_module_1.IndexingModule,
            workflow_engine_module_1.WorkflowEngineModule,
            notification_module_1.NotificationModule,
            archive_module_1.ArchiveModule,
            cleanup_module_1.CleanupModule,
            queue_admin_module_1.QueueAdminModule,
        ],
        providers: [job_lifecycle_listener_1.JobLifecycleListener],
    })
], AgentsModule);
//# sourceMappingURL=agents.module.js.map