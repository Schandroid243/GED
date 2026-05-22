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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueAdminModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const express_1 = require("@bull-board/express");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const api_1 = require("@bull-board/api");
const queue_names_enum_1 = require("../common/queues/queue-names.enum");
const basicAuth = require("express-basic-auth");
let QueueAdminModule = class QueueAdminModule {
    q1;
    q2;
    q3;
    q4;
    q5;
    q6;
    q7;
    q8;
    config;
    constructor(q1, q2, q3, q4, q5, q6, q7, q8, config) {
        this.q1 = q1;
        this.q2 = q2;
        this.q3 = q3;
        this.q4 = q4;
        this.q5 = q5;
        this.q6 = q6;
        this.q7 = q7;
        this.q8 = q8;
        this.config = config;
    }
    configure(consumer) {
        const serverAdapter = new express_1.ExpressAdapter();
        serverAdapter.setBasePath('/admin/queues');
        (0, api_1.createBullBoard)({
            queues: [
                this.q1, this.q2, this.q3, this.q4,
                this.q5, this.q6, this.q7, this.q8,
            ].map((q) => new bullMQAdapter_1.BullMQAdapter(q)),
            serverAdapter,
        });
        const username = this.config.get('BULL_BOARD_USERNAME', 'admin');
        const password = this.config.get('BULL_BOARD_PASSWORD', 'changeme');
        consumer
            .apply(basicAuth({
            users: { [username]: password },
            challenge: true,
            realm: 'BullBoard Admin',
        }), serverAdapter.getRouter())
            .forRoutes('/admin/queues');
    }
};
exports.QueueAdminModule = QueueAdminModule;
exports.QueueAdminModule = QueueAdminModule = __decorate([
    (0, common_1.Module)({}),
    __param(0, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.DOCUMENT_INGESTION)),
    __param(1, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.OCR_EXTRACTION)),
    __param(2, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.CLASSIFICATION)),
    __param(3, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.INDEXING)),
    __param(4, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.WORKFLOW_ENGINE)),
    __param(5, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.NOTIFICATION)),
    __param(6, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.ARCHIVE)),
    __param(7, (0, bullmq_1.InjectQueue)(queue_names_enum_1.QueueName.DEAD_LETTER)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        config_1.ConfigService])
], QueueAdminModule);
//# sourceMappingURL=queue-admin.module.js.map