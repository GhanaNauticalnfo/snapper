import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveVesselRegistrationNumber1749799002052 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT IF EXISTS "UQ_vessel_registration_number"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "registration_number"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "registration_number" varchar(50)`);
        await queryRunner.query(`ALTER TABLE "vessel" ADD CONSTRAINT "UQ_vessel_registration_number" UNIQUE ("registration_number")`);
    }

}
