import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVesselLatestPosition1749800000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add latest_position_id and latest_position_updated columns to vessel table
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "latest_position_id" integer`);
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "latest_position_updated" timestamptz`);
        
        // Add foreign key constraint
        await queryRunner.query(`ALTER TABLE "vessel" ADD CONSTRAINT "FK_vessel_latest_position" FOREIGN KEY ("latest_position_id") REFERENCES "tracking_point"("id") ON DELETE SET NULL`);
        
        // Add index on latest_position_id for performance
        await queryRunner.query(`CREATE INDEX "IDX_vessel_latest_position_id" ON "vessel" ("latest_position_id")`);
        
        // Populate existing vessels with their actual latest positions
        await queryRunner.query(`
            UPDATE vessel 
            SET 
                latest_position_id = subquery.latest_tracking_id,
                latest_position_updated = subquery.latest_timestamp
            FROM (
                SELECT DISTINCT ON (vessel_id)
                    vessel_id,
                    id as latest_tracking_id,
                    timestamp as latest_timestamp
                FROM tracking_point
                ORDER BY vessel_id, timestamp DESC
            ) as subquery
            WHERE vessel.id = subquery.vessel_id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vessel_latest_position_id"`);
        
        // Remove foreign key constraint
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT IF EXISTS "FK_vessel_latest_position"`);
        
        // Remove columns
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "latest_position_updated"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "latest_position_id"`);
    }
}