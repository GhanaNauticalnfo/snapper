import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveBatteryAndSignalFromTelemetry1752299802395 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop battery_level and signal_strength columns from vessel_telemetry table
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" DROP COLUMN IF EXISTS "battery_level"`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" DROP COLUMN IF EXISTS "signal_strength"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add battery_level and signal_strength columns if rolling back
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ADD COLUMN "battery_level" integer`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ADD COLUMN "signal_strength" integer`);
    }

}
