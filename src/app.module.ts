import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { envValidationSchema } from './config/env.validation';
import { bullConfigFactory } from './config/bull.config';

// Modules partagés
import { StorageModule } from './storage/storage.module';
import { DocumentModule } from './documents/document.module';
import { TenantModule } from './tenants/tenant.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { QueueName } from './common/queues/queue-names.enum';
import { QueueAdminModule } from './admin/queue-admin.module';
import { JobsModule } from './jobs/jobs.module';

// Entités
import { JobRecord } from './agents/entities/job-record.entity';
import { Document } from './documents/entities/document.entity';
import { OcrResult } from './documents/entities/ocr-result.entity';
import { User } from './users/entities/user.entity';
import { Tenant } from './tenants/entities/tenant.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.agents',
      validationSchema: envValidationSchema,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT') as number,
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [JobRecord, Document, OcrResult, User, Tenant],
        synchronize: config.get<boolean>('DB_SYNCHRONIZE') ?? false,
        logging: config.get<boolean>('DB_LOGGING') ?? false,
      }),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: bullConfigFactory,
      inject: [ConfigService],
    }),

    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          rootPath: config.get<string>('LOCAL_STORAGE_ROOT')!,
          serveRoot: '/files',
          serveStaticOptions: {
            index: false,
            dotfiles: 'deny',
          },
        },
      ],
      inject: [ConfigService],
    }),

    // Modules métier
    StorageModule,
    DocumentModule,
    TenantModule,
    AuthModule,
    UsersModule,
    QueueAdminModule,
    JobsModule,
  ],
})
export class AppModule {}
