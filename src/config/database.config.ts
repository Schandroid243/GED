import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { JobRecord } from '../agents/entities/job-record.entity';
import { Document }  from '../documents/entities/document.entity';
import { OcrResult } from '../documents/entities/ocr-result.entity';

export const databaseConfigFactory = (config: ConfigService): TypeOrmModuleOptions => ({
  type:        'mysql',
  host:        config.get<string>('DB_HOST'),
  port:        config.get<number>('DB_PORT'),
  username:    config.get<string>('DB_USER'),
  password:    config.get<string>('DB_PASSWORD'),
  database:    config.get<string>('DB_NAME'),
  entities:    [JobRecord, Document, OcrResult],
  synchronize: config.get<boolean>('DB_SYNCHRONIZE'), // false en production
  logging:     config.get<boolean>('DB_LOGGING'),
});
