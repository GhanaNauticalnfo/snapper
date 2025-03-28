// src/app/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { KmlDataset } from '../app/kml-dataset/kml-dataset.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const env = process.env.NODE_ENV || 'development';
  
  console.log('Loading database config...');
  console.log('__dirname:', __dirname);
  console.log('KmlDataset entity loaded:', !!KmlDataset);
  
  const baseConfig = {
    type: 'postgres' as const,
    entities: [KmlDataset], // Directly reference the entity class
    synchronize: env !== 'production',
    logging: true, // Enable for debugging
  };
  
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL connection');
    return {
      ...baseConfig,
      url: process.env.DATABASE_URL,
      ssl: env === 'production' ? { rejectUnauthorized: false } : false,
    };
  }
  
  console.log('Using individual connection parameters');
  return {
    ...baseConfig,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'snapper_user',
    password: process.env.DATABASE_PASSWORD || 'snapper_password',
    database: process.env.DATABASE_NAME || 'snapper_db',
  };
};