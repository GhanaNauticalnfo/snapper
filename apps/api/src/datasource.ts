// apps/api/src/datasource.ts
import { DataSource } from 'typeorm';
import * as path from 'path';
import 'dotenv/config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

// Determine if running as compiled JS (checks file extension)
const isCompiled = path.extname(__filename) === '.js';

// Base directory calculation is different depending on context:
// - TS execution (ts-node): __dirname is apps/api/src
// - JS execution (compiled via tsc): __dirname is dist/apps/api/cli_build
const baseDir = __dirname; // Use __dirname directly

// Paths for JS (compiled) execution relative to cli_build directory
const jsEntitiesPath = path.join(baseDir, '**', '*.entity.js'); // Look within cli_build/**
const jsMigrationsPath = path.join(baseDir, 'migrations', '*.js'); // Look within cli_build/migrations

// Paths for TS (source) execution relative to src directory
const tsEntitiesPath = path.join(baseDir, '**', '*.entity.ts'); // Look within src/**
const tsMigrationsPath = path.join(baseDir, 'migrations', '*.ts'); // Look within src/migrations

// Select the correct paths based on execution context
const entities = [isCompiled ? jsEntitiesPath : tsEntitiesPath];
const migrations = [isCompiled ? jsMigrationsPath : tsMigrationsPath];

console.log(`[DataSource CLI] Mode: ${isCompiled ? 'JS (Compiled via TSC)' : 'TS (Source)'}`);
console.log(`[DataSource CLI] __dirname: ${__dirname}`);
console.log(`[DataSource CLI] Effective Entities Path: ${entities[0]}`);
console.log(`[DataSource CLI] Effective Migrations Path: ${migrations[0]}`);
// --- End Path Calculation ---

// --- Core DataSource Options ---
// Use the specific PostgresConnectionOptions type
export const dataSourceOptions: PostgresConnectionOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    // Provide host/port etc., only if URL is not set
    host: process.env.DATABASE_URL ? undefined : process.env.DATABASE_HOST,
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_URL ? undefined : process.env.DATABASE_USER,
    password: process.env.DATABASE_URL ? undefined : process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_URL ? undefined : process.env.DATABASE_NAME,
    // Use the dynamically determined paths
    entities: entities,
    migrations: migrations,
    migrationsTableName: 'migrations',
    synchronize: false, // CRITICAL: ALWAYS FALSE
    logging: process.env.TYPEORM_LOGGING === 'true',
    ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false } // Use TlsOptions object
        : false, // Use boolean false
};

// --- Validation ---
const hasUrl = !!dataSourceOptions.url;
// Need to check host/user/db only if URL is not set
const hasDetails = !hasUrl && !!(dataSourceOptions.host && dataSourceOptions.username && dataSourceOptions.database);

if (!hasUrl && !hasDetails) {
    console.error("[DataSource CLI] Error: Insufficient database connection details.");
    console.error("[DataSource CLI] Set DATABASE_URL or DATABASE_HOST/PORT/USER/PASSWORD/NAME env vars.");
    throw new Error("Database configuration incomplete for CLI.");
}
console.log(`[DataSource CLI] Connection Method: ${hasUrl ? 'DATABASE_URL' : 'Host/User/DB Details'}`);
// --- End Validation ---

// --- Exports ---
// Export the DataSource instance specifically for the TypeORM CLI
export const AppDataSource = new DataSource(dataSourceOptions);

// Export a function to get the options, usable by NestJS config (typed correctly)
export const getTypeOrmDataSourceOptions = (): PostgresConnectionOptions => {
    return { ...dataSourceOptions };
};