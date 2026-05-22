"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bullConfigFactory = void 0;
const bullConfigFactory = (config) => ({
    connection: {
        host: config.get('REDIS_HOST') || 'localhost',
        port: config.get('REDIS_PORT') || 6379,
        password: config.get('REDIS_PASSWORD') || undefined,
        db: config.get('REDIS_DB') || 0,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 7 * 24 * 3600,
            count: 1000,
        },
        removeOnFail: {
            age: 30 * 24 * 3600,
        },
    },
});
exports.bullConfigFactory = bullConfigFactory;
//# sourceMappingURL=bull.config.js.map