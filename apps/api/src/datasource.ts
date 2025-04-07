// apps/api/src/datasource.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
// Load environment variables from .env files using dotenv/config
// Ensures .env vars are available for CLI commands. NestJS handles this for runtime.
import 'dotenv/config';

// Determine if running as compiled JS (checks file extension)
const isCompiled = path.extname(__filename) === '.js';

// --- Path Calculation ---
// Calculate base directory relative to this file's location.
// Assumes standard Nx output structure:
// - TS: apps/api/src/datasource.ts -> baseDir = apps/api/src
// - JS: dist/apps/api/datasource.js -> baseDir = dist/apps/api
const baseDir = isCompiled ? __dirname : path.join(__dirname);

// Define paths relative to the baseDir calculated above
const entitiesPath = path.join(baseDir, '**', '*.entity{.ts,.js}');
const migrationsPath = path.join(baseDir, 'migrations', '*{.ts,.js}'); // Migrations assumed to be in ./migrations relative to entities/datasource

console.log(`[DataSource CLI] Running in ${isCompiled ? 'compiled JS' : 'TypeScript'} mode.`);
console.log(`[DataSource CLI] Base directory calculated as: ${baseDir}`);
console.log(`[DataSource CLI] Loading entities from: ${entitiesPath}`);
console.log(`[DataSource CLI] Loading migrations from: ${migrationsPath}`);
// --- End Path Calculation ---

// --- Core DataSource Options ---
// Defined once here, exported for use by NestJS config.
export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    // Prefer DATABASE_URL if provided, otherwise use individual components
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST, // Ignored if DATABASE_URL is set
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [entitiesPath], // Use calculated paths
    migrations: [migrationsPath], // Use calculated paths
    migrationsTableName: 'migrations', // Explicitly define table name
    synchronize: false, // <<< CRITICAL: ALWAYS FALSE for migrations & CLI >>>
    logging: process.env.TYPEORM_LOGGING === 'true', // Control CLI logging via env var
    ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false } // Adjust SSL for prod as needed
        : false,
};

// --- Validation ---
const hasUrl = !!dataSourceOptions.url;
const hasDetails = !!(dataSourceOptions.host && dataSourceOptions.username && dataSourceOptions.database);

if (!hasUrl && !hasDetails) {
    console.error("[DataSource CLI] Error: Database connection details missing.");
    console.error("[DataSource CLI] Set DATABASE_URL or DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME env vars.");
    throw new Error("Database configuration incomplete for CLI.");
}
if(hasUrl){
    console.log("[DataSource CLI] Using DATABASE_URL.");
} else {
    console.log("[DataSource CLI] Using individual DB connection parameters.");
}
// --- End Validation ---

// --- Exports ---
// Export the DataSource instance specifically for the TypeORM CLI runner scripts
export const AppDataSource = new DataSource(dataSourceOptions);

// Export a function to get the options, usable by NestJS config
export const getTypeOrmDataSourceOptions = (): DataSourceOptions => {
    // Return a copy to prevent accidental modification if needed, though options are generally static
    return { ...dataSourceOptions };
};