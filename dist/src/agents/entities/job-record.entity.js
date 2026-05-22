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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobRecord = void 0;
const typeorm_1 = require("typeorm");
const queue_names_enum_1 = require("../../common/queues/queue-names.enum");
let JobRecord = class JobRecord {
    jobId;
    queueName;
    jobName;
    data;
    status;
    attemptsMade;
    correlationId;
    failedReason;
    returnValue;
    createdAt;
    updatedAt;
};
exports.JobRecord = JobRecord;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], JobRecord.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], JobRecord.prototype, "queueName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], JobRecord.prototype, "jobName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], JobRecord.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'],
        default: 'waiting',
    }),
    __metadata("design:type", String)
], JobRecord.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'tinyint', default: 0 }),
    __metadata("design:type", Number)
], JobRecord.prototype, "attemptsMade", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", String)
], JobRecord.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], JobRecord.prototype, "failedReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], JobRecord.prototype, "returnValue", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JobRecord.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], JobRecord.prototype, "updatedAt", void 0);
exports.JobRecord = JobRecord = __decorate([
    (0, typeorm_1.Entity)('job_records'),
    (0, typeorm_1.Index)(['queueName', 'status']),
    (0, typeorm_1.Index)(['createdAt'])
], JobRecord);
//# sourceMappingURL=job-record.entity.js.map