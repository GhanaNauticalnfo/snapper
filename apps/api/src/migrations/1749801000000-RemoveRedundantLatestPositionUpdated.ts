import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveRedundantLatestPositionUpdated1749801000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove the redundant latest_position_updated column
        // The timestamp is already available via latest_position.timestamp
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "latest_position_updated"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add the column if needed for rollback
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "latest_position_updated" timestamptz`);
        
        // Populate with existing latest position timestamps
        await queryRunner.query(`
            UPDATE vessel 
            SET latest_position_updated = tracking_point.timestamp
            FROM tracking_point
            WHERE vessel.latest_position_id = tracking_point.id
        `);
    }
}