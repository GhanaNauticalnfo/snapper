// apps/api/src/config/typeorm.config.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file specifically for CLI use cases.
dotenv.config();

const env = process.env.NODE_ENV || 'development';

// For CLI operations like migrations, use the source files directly
const entitiesPath = process.env.NX_TASK_TARGET_PROJECT
  ? path.join(__dirname, '../**/*.entity{.ts,.js}') // For NestJS runtime
  : path.join(process.cwd(), 'apps/api/src/**/*.entity{.ts,.js}'); // For CLI

console.log('TypeORM config loaded, entities path:', entitiesPath);

// Define the core options in one place
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USER || 'snapper_user',
        password: process.env.DATABASE_PASSWORD || 'snapper_password',
        database: process.env.DATABASE_NAME || 'snapper_db',
      }),
  // Entities path that will work for CLI operations
  entities: [entitiesPath],
  migrations: [
    process.env.NX_TASK_TARGET_PROJECT
      ? path.join(__dirname, '../migrations/*{.ts,.js}')
      : path.join(process.cwd(), 'apps/api/src/migrations/*{.ts,.js}')
  ],
  ssl: env === 'production' ? { rejectUnauthorized: false } : false,
};

// Export the DataSource instance needed by the TypeORM CLI scripts in package.json
export default new DataSource(dataSourceOptions);