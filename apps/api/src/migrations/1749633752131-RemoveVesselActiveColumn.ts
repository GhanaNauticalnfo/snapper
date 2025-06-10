import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveVesselActiveColumn1749633752131 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove the active column from vessel table
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN "active"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add the active column if rollback is needed
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "active" boolean NOT NULL DEFAULT true`);
    }

}
