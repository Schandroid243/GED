import { BullRootModuleOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const bullConfigFactory = (config: ConfigService): BullRootModuleOptions => ({
  connection: {
    host:               config.get<string>('REDIS_HOST') || 'localhost',
    port:               config.get<number>('REDIS_PORT') || 6379,
    password:           config.get<string>('REDIS_PASSWORD') || undefined,
    db:                 config.get<number>('REDIS_DB') || 0,
    maxRetriesPerRequest: null, // OBLIGATOIRE pour BullMQ
    enableReadyCheck:   false,  // OBLIGATOIRE pour BullMQ
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type:  'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age:   7 * 24 * 3600, // 7 jours
      count: 1000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // 30 jours
    },
  },
});
