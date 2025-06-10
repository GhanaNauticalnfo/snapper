import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameTrackingPointToVesselTelemetry1749879595153 implements MigrationInterface {
    name = 'RenameTrackingPointToVesselTelemetry1749879595153'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename the tracking_point table to vessel_telemetry
        await queryRunner.query(`ALTER TABLE "tracking_point" RENAME TO "vessel_telemetry"`);
        
        // Update foreign key constraint name to reflect new table name
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" DROP CONSTRAINT "FK_a6aed8aa8012cff8c90f88508fb"`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ADD CONSTRAINT "FK_vessel_telemetry_vessel_id" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        // Note: Indexes will be automatically recreated by TypeORM based on entity decorators
        // The spatial index on position and timestamp index will be handled by the entity definition
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the changes - rename back to tracking_point
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" DROP CONSTRAINT "FK_vessel_telemetry_vessel_id"`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ADD CONSTRAINT "FK_a6aed8aa8012cff8c90f88508fb" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" RENAME TO "tracking_point"`);
    }

}
