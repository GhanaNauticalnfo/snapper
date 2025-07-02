import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSyncVersionSupport1751526121318 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create sync_version table
        await queryRunner.query(`
            CREATE TABLE sync_version (
                id SERIAL PRIMARY KEY,
                major_version INTEGER NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT NOW(),
                is_current BOOLEAN DEFAULT false
            )
        `);

        // Add major_version column to sync_log table (nullable initially)
        await queryRunner.query(`
            ALTER TABLE sync_log 
            ADD COLUMN major_version INTEGER
        `);

        // Insert initial version record
        await queryRunner.query(`
            INSERT INTO sync_version (major_version, is_current) 
            VALUES (1, true)
        `);

        // Update all existing sync_log entries to major_version = 1
        await queryRunner.query(`
            UPDATE sync_log 
            SET major_version = 1
        `);

        // Make major_version column NOT NULL
        await queryRunner.query(`
            ALTER TABLE sync_log 
            ALTER COLUMN major_version SET NOT NULL
        `);

        // Add index for efficient queries by major version
        await queryRunner.query(`
            CREATE INDEX idx_sync_log_major_version 
            ON sync_log(major_version, created_at, is_latest)
            WHERE is_latest = true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX IF EXISTS idx_sync_log_major_version`);

        // Drop major_version column from sync_log
        await queryRunner.query(`ALTER TABLE sync_log DROP COLUMN major_version`);

        // Drop sync_version table
        await queryRunner.query(`DROP TABLE IF EXISTS sync_version`);
    }

}
