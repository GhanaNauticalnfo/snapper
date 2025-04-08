// apps/api/src/datasource.ts
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv'; // Import dotenv
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

// Explicitly load the .env.development file from the project root
// Path is relative from apps/api/src/datasource.ts up to the root
const envPath = path.resolve(__dirname, '../../../.env.development');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn(`[DataSource CLI] Warning: Could not load .env file from ${envPath}:`, result.error.message);
    // Don't throw an error here, maybe env vars are set globally
} else {
    console.log(`[DataSource CLI] Loaded environment variables from: ${envPath}`);
}

// Check necessary variables AFTER attempting to load .env
if (!process.env.DATABASE_HOST && !process.env.DATABASE_URL) {
     console.error("[DataSource CLI] Error: DB connection details missing after attempting to load .env.");
     console.error("[DataSource CLI] Ensure DATABASE_URL or DATABASE_HOST/PORT/USER/PASSWORD/NAME are set in .env.development or globally.");
     // Optionally, throw an error here if you absolutely require the .env file
     // throw new Error("Database configuration missing.");
}


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

// This validation should now pass if .env was loaded correctly
if (!hasUrl && !hasDetails) {
    console.error("[DataSource CLI] Error: Insufficient database connection details even after loading .env.");
    throw new Error("Database configuration incomplete for CLI.");
}
console.log(`[DataSource CLI] Connection Method: ${hasUrl ? 'DATABASE_URL' : 'Host/User/DB Details'}`);
//
export const AppDataSource = new DataSource(dataSourceOptions);
//
export const getTypeOrmDataSourceOptions = (): PostgresConnectionOptions => {
    return { ...dataSourceOptions };
};