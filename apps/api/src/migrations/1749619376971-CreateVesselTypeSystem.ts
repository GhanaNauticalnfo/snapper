import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVesselTypeSystem1749619376971 implements MigrationInterface {
    name = 'CreateVesselTypeSystem1749619376971'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create vessel_type table (without is_system column as it's not used in the final implementation)
        await queryRunner.query(`
            CREATE TABLE "vessel_type" (
                "id" SERIAL NOT NULL, 
                "name" character varying(30) NOT NULL, 
                "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
                CONSTRAINT "UQ_vessel_type_name" UNIQUE ("name"), 
                CONSTRAINT "PK_vessel_type_id" PRIMARY KEY ("id")
            )
        `);
        
        // Insert default vessel types - ID 1 is always "Unspecified"
        await queryRunner.query(`INSERT INTO "vessel_type" ("id", "name") VALUES (1, 'Unspecified')`);
        await queryRunner.query(`INSERT INTO "vessel_type" ("id", "name") VALUES (2, 'Canoe')`);
        
        // Reset sequence to continue from the highest ID
        await queryRunner.query(`SELECT setval('vessel_type_id_seq', 2)`);
        
        // Get all unique vessel types from existing vessels (excluding the ones we just inserted)
        const existingTypes = await queryRunner.query(`
            SELECT DISTINCT vessel_type 
            FROM vessel 
            WHERE vessel_type NOT IN ('Unspecified', 'Canoe') 
            AND vessel_type IS NOT NULL 
            AND vessel_type != ''
        `);
        
        // Insert any additional vessel types found in existing data
        for (const type of existingTypes) {
            await queryRunner.query(`INSERT INTO "vessel_type" ("name") VALUES ($1)`, [type.vessel_type]);
        }
        
        // Add vessel_type_id column to vessel table
        await queryRunner.query(`ALTER TABLE "vessel" ADD "vessel_type_id" integer`);
        
        // Update vessels to reference vessel types by ID
        await queryRunner.query(`
            UPDATE vessel 
            SET vessel_type_id = (
                SELECT id FROM vessel_type 
                WHERE vessel_type.name = vessel.vessel_type
            )
            WHERE vessel.vessel_type IS NOT NULL
        `);
        
        // Set default vessel type (ID=1, "Unspecified") for any vessels without a type
        await queryRunner.query(`
            UPDATE vessel 
            SET vessel_type_id = 1
            WHERE vessel_type_id IS NULL
        `);
        
        // Make vessel_type_id NOT NULL and add foreign key constraint
        await queryRunner.query(`ALTER TABLE "vessel" ALTER COLUMN "vessel_type_id" SET NOT NULL`);
        await queryRunner.query(`
            ALTER TABLE "vessel" 
            ADD CONSTRAINT "FK_vessel_vessel_type" 
            FOREIGN KEY ("vessel_type_id") 
            REFERENCES "vessel_type"("id") 
            ON DELETE NO ACTION 
            ON UPDATE NO ACTION
        `);
        
        // Remove the old vessel_type string column
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN "vessel_type"`);
        
        // Reset the vessel_type sequence to ensure next ID is correct
        await queryRunner.query(`SELECT setval('vessel_type_id_seq', (SELECT MAX(id) FROM vessel_type))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back the vessel_type string column
        await queryRunner.query(`ALTER TABLE "vessel" ADD "vessel_type" character varying(50) NOT NULL DEFAULT 'Unspecified'`);
        
        // Populate vessel_type column from vessel_type table
        await queryRunner.query(`
            UPDATE vessel 
            SET vessel_type = (
                SELECT name FROM vessel_type 
                WHERE vessel_type.id = vessel.vessel_type_id
            )
        `);
        
        // Drop foreign key constraint - check which name is used
        const constraintName = await queryRunner.query(`
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'vessel'::regclass 
            AND contype = 'f' 
            AND confrelid = 'vessel_type'::regclass
        `);
        
        if (constraintName.length > 0) {
            await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT "${constraintName[0].conname}"`);
        }
        
        // Drop vessel_type_id column
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN "vessel_type_id"`);
        
        // Drop vessel_type table
        await queryRunner.query(`DROP TABLE "vessel_type"`);
    }
}