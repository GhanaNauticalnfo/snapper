import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeviceStateField1749561989438 implements MigrationInterface {
    name = 'AddDeviceStateField1749561989438'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type
        await queryRunner.query(`CREATE TYPE "device_state_enum" AS ENUM('pending', 'active', 'retired')`);
        
        // Add the state column with default value
        await queryRunner.query(`ALTER TABLE "devices" ADD "state" "device_state_enum" NOT NULL DEFAULT 'pending'`);
        
        // Update existing devices: set state based on is_activated
        await queryRunner.query(`UPDATE "devices" SET "state" = 'active' WHERE "is_activated" = true`);
        await queryRunner.query(`UPDATE "devices" SET "state" = 'pending' WHERE "is_activated" = false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the state column
        await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "state"`);
        
        // Drop the enum type
        await queryRunner.query(`DROP TYPE "device_state_enum"`);
    }

}
