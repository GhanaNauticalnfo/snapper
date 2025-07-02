import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveVesselPhysicalAndOwnerFields1751454754643 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the columns from vessel table
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "length_meters"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "owner_name"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "owner_contact"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "home_port"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add the columns if we need to rollback
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "length_meters" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "owner_name" varchar(255)`);
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "owner_contact" varchar(255)`);
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "home_port" varchar(100)`);
    }

}
