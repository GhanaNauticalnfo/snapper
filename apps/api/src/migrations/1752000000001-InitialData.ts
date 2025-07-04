import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialData1752000000001 implements MigrationInterface {
    name = 'InitialData1752000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert default vessel type
        await queryRunner.query(`
            INSERT INTO "vessel_type" ("id", "name", "color") 
            VALUES (1, 'Unspecified', '#808080')
        `);
        
        // Update the sequence to start after our inserted ID
        await queryRunner.query(`
            SELECT setval('vessel_type_id_seq', (SELECT MAX(id) FROM vessel_type), true)
        `);

        // Insert sync version
        await queryRunner.query(`
            INSERT INTO "sync_version" ("major_version", "is_current") 
            VALUES (1, true)
        `);

        // Insert default settings
        await queryRunner.query(`
            INSERT INTO "settings" ("key", "value") 
            VALUES ('route.defaultColor', '#0000FF')
        `);

        // Insert setting types
        await queryRunner.query(`
            INSERT INTO "setting_types" ("resource_type", "setting_key", "display_name", "data_type", "is_required") 
            VALUES 
            ('vessel_type', 'color', 'Color', 'string', false),
            ('route', 'color', 'Color', 'string', false),
            ('vessel_type', 'visibility', 'Visibility', 'boolean', false)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove setting types
        await queryRunner.query(`DELETE FROM "setting_types" WHERE "setting_key" IN ('color', 'visibility')`);

        // Remove settings
        await queryRunner.query(`DELETE FROM "settings" WHERE "key" = 'route.defaultColor'`);

        // Remove sync version
        await queryRunner.query(`DELETE FROM "sync_version" WHERE "major_version" = 1`);

        // Remove vessel type
        await queryRunner.query(`DELETE FROM "vessel_type" WHERE "id" = 1`);
    }
}