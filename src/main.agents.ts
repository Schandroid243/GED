import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AgentsModule } from './agents/agents.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('AgentsBootstrap');

  // createApplicationContext : pas de serveur HTTP
  const app = await NestFactory.createApplicationContext(AgentsModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  await app.init();
  logger.log('Agents workers démarrés et en écoute des files BullMQ.');

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
  console.error('Échec du démarrage des agents :', err);
  process.exit(1);
});
