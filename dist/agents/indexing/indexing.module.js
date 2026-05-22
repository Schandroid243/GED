"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexingModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
const indexing_processor_1 = require("./indexing.processor");
const indexing_service_1 = require("./indexing.service");
const document_module_1 = require("../../documents/document.module");
let IndexingModule = class IndexingModule {
};
exports.IndexingModule = IndexingModule;
exports.IndexingModule = IndexingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueueAsync({
                name: queue_names_enum_1.QueueName.INDEXING,
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    defaultJobOptions: {
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 1000 },
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            document_module_1.DocumentModule,
        ],
        providers: [indexing_service_1.IndexingService, indexing_processor_1.IndexingProcessor],
    })
], IndexingModule);
//# sourceMappingURL=indexing.module.js.map