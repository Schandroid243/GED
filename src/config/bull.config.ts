import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export const bullConfigFactory = (config: ConfigService): BullModuleOptions => ({
  connection: {
    host:               config.get<string>('REDIS_HOST'),
    port:               config.get<number>('REDIS_PORT'),
    password:           config.get<string>('REDIS_PASSWORD') || undefined,
    db:                 config.get<number>('REDIS_DB'),
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
