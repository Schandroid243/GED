import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

/**
 * DataSource TypeORM standalone pour les CLI commands (typeorm migration:run, etc.)
 *
 * ═══════════════════════════════════════════════════════════════
 * ATTENTION : Ce fichier lit `process.env` car il est exécuté
 * en dehors du contexte NestJS (via npx typeorm CLI).
 * À l'intérieur de NestJS, utilisez ConfigService à la place.
 * ═══════════════════════════════════════════════════════════════
 *
 * Usage :
 *   npx typeorm -d dist/database/datasource.js migration:run
 *   npx typeorm -d dist/database/datasource.js migration:revert
 *   npx typeorm -d dist/database/datasource.js migration:show
 *
 * Pour générer une migration :
 *   npx typeorm -d dist/database/datasource.js migration:generate
 *       src/database/migrations/CreateSomeTable
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.agents') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ged_db',
  entities: [path.resolve(__dirname, '..', '**', '*.entity.{js,ts}')],
  migrations: [path.resolve(__dirname, 'migrations', '*.{js,ts}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false, // TOUJOURS false pour les migrations
  logging: process.env.DB_LOGGING === 'true' ? ['query', 'error', 'schema'] : ['error'],
  charset: 'utf8mb4',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
