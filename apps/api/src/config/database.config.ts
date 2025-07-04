// apps/api/src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
// We don't need getTypeOrmDataSourceOptions here anymore for defaults
// import { getTypeOrmDataSourceOptions } from '../datasource';
import { LoggerOptions } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

type TypeOrmLogLevel = "query" | "error" | "schema" | "warn" | "info" | "log" | "migration";

const getLoggerOptions = (configValue: string | boolean | undefined): LoggerOptions | undefined => {
    if (configValue === 'true' || configValue === true) return 'all';
    if (configValue === 'false' || configValue === false) return undefined;
    if (typeof configValue === 'string' && configValue.includes(',')) {
        // Consider adding validation ensure levels are valid TypeOrmLogLevel
        return configValue.split(',').map(s => s.trim()) as TypeOrmLogLevel[];
    }
    return undefined;
};

export const typeOrmModuleOptionsFactory = (configService: ConfigService): TypeOrmModuleOptions => {
    console.log('[NestJS DB Config] Loading database config for NestJS runtime...');

    // Get runtime logging preference directly from ConfigService
    const loggingSetting = configService.get<string | boolean>(
        'TYPEORM_LOGGING',
        configService.get<string>('NODE_ENV', 'local') !== 'prod' // Default based on NODE_ENV
    );
    const runtimeLogging = getLoggerOptions(loggingSetting);

    // --- Get Connection Details Primarily from ConfigService ---
    // Provide only essential, safe, hardcoded defaults if needed.
    const url = configService.get<string>('DATABASE_URL'); // No default needed; rely on env var presence
    const host = configService.get<string>('DATABASE_HOST'); // No default needed
    const port = configService.get<number>('DATABASE_PORT', 5432); // Safe default: 5432 for Postgres
    const username = configService.get<string>('DATABASE_USER'); // No default needed
    const password = configService.get<string>('DATABASE_PASSWORD'); // No default needed
    const database = configService.get<string>('DATABASE_NAME'); // No default needed
    const sslEnabled = configService.get<string | boolean>('DATABASE_SSL', process.env.NODE_ENV === 'prod'); // Default SSL based on NODE_ENV

    const sslOptions = (sslEnabled === 'true' || sslEnabled === true)
        ? { rejectUnauthorized: false } // Basic SSL, adjust as needed
        : false;

    // --- Construct Final Options ---
    // Build the options object directly using values from ConfigService
    const finalOptions: TypeOrmModuleOptions = {
        type: 'postgres', // Explicitly set the type

        // Assign derived connection details
        url: url, // Pass url if defined
        // Only pass host/port etc., if URL is NOT defined
        host: !url ? host : undefined,
        port: !url ? port : undefined,
        username: !url ? username : undefined,
        password: !url ? password : undefined,
        database: !url ? database : undefined,
        ssl: sslOptions,

        // Runtime specific settings
        synchronize: false, // Disabled to prevent schema conflicts
        logging: runtimeLogging,
        autoLoadEntities: true, // Use NestJS mechanism

        // Make sure these are not included when using autoLoadEntities
        entities: undefined,
        migrations: undefined,
        subscribers: undefined,

    } as PostgresConnectionOptions & TypeOrmModuleOptions; // Type assertion still useful

    // --- Final Validation (Runtime) ---
    const checkOptions = finalOptions as Partial<PostgresConnectionOptions>;
    const hasUrl = !!checkOptions.url;
    // Check host/user/db only if URL is not provided
    const hasDetails = !hasUrl && !!(checkOptions.host && checkOptions.username && checkOptions.database);

    // Ensure *either* URL *or* Details are sufficiently provided
    if (!hasUrl && !hasDetails) {
        console.error("[NestJS DB Config] Error: Insufficient database connection details for runtime.");
        console.error("[NestJS DB Config] Ensure either DATABASE_URL or (DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME) are set in environment and loaded by ConfigModule.");
        throw new Error("Database configuration incomplete for NestJS runtime.");
    }

    console.log('[NestJS DB Config] Database config loaded. Synchronize: false.');
    console.log(`[NestJS DB Config] Connection Method: ${hasUrl ? 'DATABASE_URL' : 'Host/User/DB Details'}`);
    console.log(`[NestJS DB Config] Logging: ${JSON.stringify(runtimeLogging)}`);

    return finalOptions;
};