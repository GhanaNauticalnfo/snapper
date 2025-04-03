// apps/api/src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { dataSourceOptions } from './typeorm.config'; // Import shared options

// This function now simply adapts the shared options for NestJS TypeOrmModule
export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  console.log('Loading database config for NestJS...');

  // Start with the shared options
  const config: TypeOrmModuleOptions = {
    ...dataSourceOptions,

    // --- NestJS TypeOrmModule Specific Options ---

    // Let NestJS handle entity discovery based on the glob pattern
    // You could potentially use autoLoadEntities with the glob in entities,
    // but providing the entities array directly from dataSourceOptions is robust.
    // autoLoadEntities: true,

    // IMPORTANT: Remove synchronize! Rely on migrations exclusively.
       // >>> KEY CHANGE HERE <<<
    // Enable synchronize ONLY in development for rapid iteration.
    // Disable it strictly for production (and ideally staging/test).
    synchronize: process.env.NODE_ENV === 'development', // Use true for dev, false otherwise

    // synchronize: false, // Explicitly false or just remove it

    // Keep logging configuration specific to NestJS runtime if needed
    logging: process.env.NODE_ENV !== 'production', // Example: log in dev, not prod
  };

  

  if (config.synchronize) {
    console.warn(
      '*** TypeORM synchronize is ENABLED. Schema changes will be applied automatically. DO NOT USE IN PRODUCTION! ***'
    );
  } else {
    console.log(
      'TypeORM synchronize is DISABLED. Using migrations for schema changes.'
    );
  }
  
  console.log(
    'Database config loaded. Using entities from glob:',
    dataSourceOptions.entities
  );

  return config;
};