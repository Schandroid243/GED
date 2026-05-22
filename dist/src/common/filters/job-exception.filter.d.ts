import { Logger } from '@nestjs/common';
export declare function handleJobError(error: unknown, logger: Logger, correlationId: string): never;
export declare function isNonRetriable(error: unknown): boolean;
