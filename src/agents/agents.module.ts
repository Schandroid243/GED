import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { envValidationSchema } from '../config/env.validation';
import { bullConfigFactory } from '../config/bull.config';
import { QueueName } from '../common/queues/queue-names.enum';

// Modules agents
import { DocumentIngestionModule } from './document-ingestion/document-ingestion.module';
import { OcrModule }               from './ocr/ocr.module';
import { ClassificationModule }    from './classification/classification.module';
import { IndexingModule }          from './indexing/indexing.module';
import { WorkflowEngineModule }    from './workflow-engine/workflow-engine.module';
import { NotificationModule }      from './notification/notification.module';
import { ArchiveModule }           from './archive/archive.module';
import { CleanupModule }           from './cleanup/cleanup.module';

// Modules partagés
import { DocumentModule } from '../documents/document.module';
import { TenantModule }   from '../tenants/tenant.module';
import { StorageModule }  from '../storage/storage.module';

// Entités
import { JobRecord } from './entities/job-record.entity';
import { Document }  from '../documents/entities/document.entity';
import { OcrResult } from '../documents/entities/ocr-result.entity';

// Listeners et admin
import { JobLifecycleListener } from './listeners/job-lifecycle.listener';
import { QueueAdminModule }     from '../admin/queue-admin.module';

@Module({
  imports: [
    // Config global – charge .env.agents, valide le schéma Joi
    ConfigModule.forRoot({
      isGlobal:         true,
      envFilePath:      '.env.agents',
      validationSchema: envValidationSchema,
    }),

    // TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type:        'mysql',
        host:        config.get<string>('DB_HOST'),
        port:        config.get<number>('DB_PORT'),
        username:    config.get<string>('DB_USER'),
        password:    config.get<string>('DB_PASSWORD'),
        database:    config.get<string>('DB_NAME'),
        entities:    [JobRecord, Document, OcrResult],
        synchronize: config.get<boolean>('DB_SYNCHRONIZE'), // false en prod
        logging:     config.get<boolean>('DB_LOGGING'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([JobRecord]),

    // BullMQ global
    BullModule.forRootAsync({
      imports:    [ConfigModule],
      useFactory: bullConfigFactory,
      inject:     [ConfigService],
    }),

    // Enregistrement DEAD_LETTER (utilisé dans plusieurs agents)
    BullModule.registerQueue({ name: QueueName.DEAD_LETTER }),

    // Modules métier partagés
    DocumentModule,
    TenantModule,
    StorageModule,

    // Modules agents
    DocumentIngestionModule,
    OcrModule,
    ClassificationModule,
    IndexingModule,
    WorkflowEngineModule,
    NotificationModule,
    ArchiveModule,
    CleanupModule,

    // Dashboard
    QueueAdminModule,
  ],
  providers: [JobLifecycleListener],
})
export class AgentsModule {}
