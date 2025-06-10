import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColorToVesselType1749645760532 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add color column to vessel_type table
        await queryRunner.query(`
            ALTER TABLE "vessel_type" 
            ADD COLUMN "color" character varying NOT NULL DEFAULT '#3B82F6'
        `);
        
        // Set specific color for the default "Unspecified" vessel type
        await queryRunner.query(`
            UPDATE "vessel_type" 
            SET "color" = '#6B7280' 
            WHERE "id" = 1
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "vessel_type" 
            DROP COLUMN "color"
        `);
    }

}
