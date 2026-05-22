"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const agents_module_1 = require("./agents/agents.module");
async function bootstrap() {
    const logger = new common_1.Logger('AgentsBootstrap');
    const app = await core_1.NestFactory.createApplicationContext(agents_module_1.AgentsModule, {
        logger: ['log', 'warn', 'error', 'debug'],
    });
    await app.init();
    logger.log('Agents workers démarrés et en écoute des files BullMQ.');
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
//# sourceMappingURL=main.agents.js.map