import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('ApiBootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  const config = app.get(ConfigService);

  const apiPort = config.get<number>('API_PORT') ?? 3000;
  const apiPrefix = config.get<string>('API_PREFIX') ?? 'api';
  const corsOrigin = config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173';

  // ── Préfixe global des routes API ───────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ── CORS ───────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── Validation globale (class-validator) ───────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  logger.log(`API démarrée sur le port ${apiPort}`);
  logger.log(`CORS autorisé : ${corsOrigin}`);
  logger.log(`Préfixe API : /${apiPrefix}`);

  await app.listen(apiPort);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM reçu, arrêt graceful...');
    await app.close();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    logger.log('SIGINT reçu, arrêt graceful...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error("Echec du demarrage de l'API:", err);
  process.exit(1);
});
