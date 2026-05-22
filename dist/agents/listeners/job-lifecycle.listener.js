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
var JobLifecycleListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobLifecycleListener = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_record_entity_1 = require("../entities/job-record.entity");
let JobLifecycleListener = JobLifecycleListener_1 = class JobLifecycleListener extends bullmq_1.QueueEventsHost {
    jobRecordRepo;
    logger = new common_1.Logger(JobLifecycleListener_1.name);
    constructor(jobRecordRepo) {
        super();
        this.jobRecordRepo = jobRecordRepo;
    }
    async onActive({ jobId }) {
        if (!jobId)
            return;
        try {
            await this.jobRecordRepo.update(jobId, { status: 'active' });
            this.logger.debug(`Job ${jobId} → active`);
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.warn(`Impossible de mettre à jour job ${jobId} → active : ${err.message}`);
            }
        }
    }
    async onCompleted({ jobId, returnvalue }) {
        if (!jobId)
            return;
        try {
            await this.jobRecordRepo.update(jobId, {
                status: 'completed',
                returnValue: JSON.parse(returnvalue || 'null'),
            });
            this.logger.debug(`Job ${jobId} → completed`);
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.warn(`Impossible de mettre à jour job ${jobId} → completed : ${err.message}`);
            }
        }
    }
    async onFailed({ jobId, failedReason }) {
        if (!jobId)
            return;
        try {
            await this.jobRecordRepo.update(jobId, { status: 'failed', failedReason });
            this.logger.error(`Job ${jobId} échoué : ${failedReason}`);
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.warn(`Impossible de mettre à jour job ${jobId} → failed : ${err.message}`);
            }
        }
    }
    async onDelayed({ jobId }) {
        if (!jobId)
            return;
        try {
            await this.jobRecordRepo.update(jobId, { status: 'delayed' });
            this.logger.debug(`Job ${jobId} → delayed`);
        }
        catch (err) {
            if (err instanceof Error) {
                this.logger.warn(`Impossible de mettre à jour job ${jobId} → delayed : ${err.message}`);
            }
        }
    }
};
exports.JobLifecycleListener = JobLifecycleListener;
__decorate([
    (0, bullmq_1.OnQueueEvent)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobLifecycleListener.prototype, "onActive", null);
__decorate([
    (0, bullmq_1.OnQueueEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobLifecycleListener.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnQueueEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobLifecycleListener.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnQueueEvent)('delayed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobLifecycleListener.prototype, "onDelayed", null);
exports.JobLifecycleListener = JobLifecycleListener = JobLifecycleListener_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.QueueEventsListener)('*'),
    __param(0, (0, typeorm_1.InjectRepository)(job_record_entity_1.JobRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], JobLifecycleListener);
//# sourceMappingURL=job-lifecycle.listener.js.map