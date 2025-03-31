// apps/api/src/config/typeorm.config.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file specifically for CLI use cases.
// NestJS app typically loads this separately (e.g., via ConfigModule)
dotenv.config();

const env = process.env.NODE_ENV || 'development';

// Define the core options in one place
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  // Use DATABASE_URL if provided (common in PaaS environments like Heroku)
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USER || 'snapper_user',
        password: process.env.DATABASE_PASSWORD || 'snapper_password',
        database: process.env.DATABASE_NAME || 'snapper_db',
      }),
  // Use reliable glob patterns for both CLI and NestJS
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
  // Common SSL setting for production
  ssl: env === 'production' ? { rejectUnauthorized: false } : false,

  // TypeORM CLI specific settings (optional but good practice)
  // migrationsTableName: 'migrations', // Optional: customize migration table name
  // cli: {
  //    migrationsDir: 'src/migrations' // Relative to project root if needed differently
  // }
};

// Export the DataSource instance needed by the TypeORM CLI scripts in package.json
export default new DataSource(dataSourceOptions);