import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
export declare class QueueAdminModule implements NestModule {
    private readonly q1;
    private readonly q2;
    private readonly q3;
    private readonly q4;
    private readonly q5;
    private readonly q6;
    private readonly q7;
    private readonly q8;
    private readonly config;
    constructor(q1: Queue, q2: Queue, q3: Queue, q4: Queue, q5: Queue, q6: Queue, q7: Queue, q8: Queue, config: ConfigService);
    configure(consumer: MiddlewareConsumer): void;
}
