// apps/api/src/datasource.ts

// --- TEMPORARY DEBUG LOGGING ---
console.log('[DEBUG] Reading process.env in datasource.ts:');
console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
console.log('[DEBUG] DATABASE_HOST:', process.env.DATABASE_HOST);
console.log('[DEBUG] DATABASE_PORT:', process.env.DATABASE_PORT);
console.log('[DEBUG] DATABASE_USER:', process.env.DATABASE_USER);
console.log('[DEBUG] DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? '******' : undefined); // Mask password
console.log('[DEBUG] DATABASE_NAME:', process.env.DATABASE_NAME);
console.log('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL);
console.log('--- END DEBUG LOGGING ---');
// --- END TEMPORARY DEBUG LOGGING ---

import { DataSource } from 'typeorm';
import * as path from 'path';
// import 'dotenv/config'; // Keep this commented out for now to rely solely on dotenv-cli
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

// ... (rest of the file remains the same as the version from # Step 1: Strengthen Typing) ...

const isCompiled = path.extname(__filename) === '.js';
const baseDir = __dirname;
const jsEntitiesPath = path.join(baseDir, '**', '*.entity.js');
const jsMigrationsPath = path.join(baseDir, 'migrations', '*.js');
const tsEntitiesPath = path.join(baseDir, '**', '*.entity.ts');
const tsMigrationsPath = path.join(baseDir, 'migrations', '*.ts');
const entities = [isCompiled ? jsEntitiesPath : tsEntitiesPath];
const migrations = [isCompiled ? jsMigrationsPath : tsMigrationsPath];

console.log(`[DataSource CLI] Mode: ${isCompiled ? 'JS (Compiled via TSC)' : 'TS (Source)'}`);
console.log(`[DataSource CLI] __dirname: ${__dirname}`);
console.log(`[DataSource CLI] Effective Entities Path: ${entities[0]}`);
console.log(`[DataSource CLI] Effective Migrations Path: ${migrations[0]}`);

export const dataSourceOptions: PostgresConnectionOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : process.env.DATABASE_HOST,
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_URL ? undefined : process.env.DATABASE_USER,
    password: process.env.DATABASE_URL ? undefined : process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_URL ? undefined : process.env.DATABASE_NAME,
    entities: entities,
    migrations: migrations,
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
    ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
};

const hasUrl = !!dataSourceOptions.url;
const hasDetails = !hasUrl && !!(dataSourceOptions.host && dataSourceOptions.username && dataSourceOptions.database);

if (!hasUrl && !hasDetails) {
    console.error("[DataSource CLI] Error: Insufficient database connection details."); // This error is being hit
    console.error("[DataSource CLI] Set DATABASE_URL or DATABASE_HOST/PORT/USER/PASSWORD/NAME env vars.");
    throw new Error("Database configuration incomplete for CLI.");
}
console.log(`[DataSource CLI] Connection Method: ${hasUrl ? 'DATABASE_URL' : 'Host/User/DB Details'}`);

export const AppDataSource = new DataSource(dataSourceOptions);

export const getTypeOrmDataSourceOptions = (): PostgresConnectionOptions => {
    return { ...dataSourceOptions };
};