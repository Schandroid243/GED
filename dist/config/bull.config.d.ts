import { BullRootModuleOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
export declare const bullConfigFactory: (config: ConfigService) => BullRootModuleOptions;
