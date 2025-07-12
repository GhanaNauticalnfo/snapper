import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRetentionDaysSetting1752299379001 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert default retention days setting
        await queryRunner.query(`
            INSERT INTO "settings" ("key", "value", "created", "last_updated")
            VALUES ('database.telemetry.retention_days', '365', NOW(), NOW())
            ON CONFLICT ("key") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove retention days setting
        await queryRunner.query(`
            DELETE FROM "settings" WHERE "key" = 'database.telemetry.retention_days'
        `);
    }

}