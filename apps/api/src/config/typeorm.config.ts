// apps/api/src/config/typeorm.config.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path'; // Make sure 'path' is imported

dotenv.config();
const env = process.env.NODE_ENV || 'development';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'snapper_user',
  password: process.env.DATABASE_PASSWORD || 'snapper_password',
  database: process.env.DATABASE_NAME || 'snapper_db',
  // Use path.join relative to this config file (__dirname)
  // Go up two levels (src, api) to reach the apps/api root, then find entities
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  // Migrations relative to this config file (__dirname)
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
  ssl: env === 'production' ? { rejectUnauthorized: false } : false,
  // Optional but can help TypeORM find things:
  // cli: {
  //   migrationsDir: 'apps/api/src/migrations' // Relative to project root
  // }
};

export default new DataSource(dataSourceOptions);
