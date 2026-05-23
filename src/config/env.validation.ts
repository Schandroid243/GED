import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(1),

  // MySQL
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // Stockage local
  LOCAL_STORAGE_ROOT:       Joi.string().required(),
  LOCAL_STORAGE_ARCHIVE:    Joi.string().required(),
  LOCAL_STORAGE_PUBLIC_URL: Joi.string().uri().required(),

  // Concurrency
  OCR_CONCURRENCY: Joi.number().min(1).default(1),
  CLASSIFICATION_CONCURRENCY: Joi.number().min(1).default(4),
  INDEXING_CONCURRENCY: Joi.number().min(1).default(2),
  WORKFLOW_CONCURRENCY: Joi.number().min(1).default(1),
  NOTIFICATION_CONCURRENCY: Joi.number().min(1).default(5),
  ARCHIVE_CONCURRENCY: Joi.number().min(1).default(2),
  INGESTION_CONCURRENCY: Joi.number().min(1).default(2),

  // Chemins système
  TESSERACT_PATH: Joi.string().default('/usr/bin/tesseract'),
  LIBREOFFICE_PATH: Joi.string().default('/usr/bin/soffice'),
  GHOSTSCRIPT_PATH: Joi.string().default('/usr/bin/gs'),
  CLAMDSCAN_PATH: Joi.string().default('/usr/bin/clamdscan'),
  UPLOAD_TEMP_DIR: Joi.string().default('/tmp/uploads'),

  // Feature flags
  AGENT_OCR_ENABLED: Joi.boolean().default(true),
  AGENT_ML_CLASSIFICATION: Joi.boolean().default(false),
  AGENT_ARCHIVE_ENABLED: Joi.boolean().default(true),

  // BullBoard
  BULL_BOARD_USERNAME: Joi.string().default('admin'),
  BULL_BOARD_PASSWORD: Joi.string().required(),

  // Alertes
  SLACK_WEBHOOK_URL:              Joi.string().uri().allow('').optional(),
  QUEUE_DEPTH_ALERT_THRESHOLD:    Joi.number().default(500),

  // API
  API_PORT:      Joi.number().default(3000),
  API_PREFIX:    Joi.string().default('api'),
  CORS_ORIGIN:   Joi.string().uri().required(),
  JWT_SECRET:           Joi.string().min(32).required(),
  JWT_EXPIRES_IN:       Joi.string().default('8h'),
  JWT_REFRESH_SECRET:    Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
});
