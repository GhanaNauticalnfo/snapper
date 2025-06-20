import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixVesselTelemetryIdSequence1750411867000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sequence for vessel_telemetry id
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS vessel_telemetry_id_seq;
    `);
    
    // Set the sequence as the default for the id column
    await queryRunner.query(`
      ALTER TABLE vessel_telemetry ALTER COLUMN id SET DEFAULT nextval('vessel_telemetry_id_seq');
    `);
    
    // Set the sequence to start from the max existing id + 1
    await queryRunner.query(`
      SELECT setval('vessel_telemetry_id_seq', COALESCE((SELECT MAX(id) FROM vessel_telemetry), 0) + 1, false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the default
    await queryRunner.query(`
      ALTER TABLE vessel_telemetry ALTER COLUMN id DROP DEFAULT;
    `);
    
    // Drop the sequence
    await queryRunner.query(`
      DROP SEQUENCE IF EXISTS vessel_telemetry_id_seq;
    `);
  }
}