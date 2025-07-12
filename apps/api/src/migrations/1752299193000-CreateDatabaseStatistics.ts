import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDatabaseStatistics1752299193000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create database_statistics table
        await queryRunner.query(`
            CREATE TABLE "database_statistics" (
                "date" DATE NOT NULL,
                "vessel_telemetry_size_gb" DECIMAL(10,4) NOT NULL,
                "vessel_telemetry_count" BIGINT NOT NULL,
                CONSTRAINT "PK_database_statistics" PRIMARY KEY ("date")
            )
        `);

        // Create index on date for efficient queries
        await queryRunner.query(`
            CREATE INDEX "IDX_database_statistics_date" ON "database_statistics" ("date")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX "IDX_database_statistics_date"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "database_statistics"`);
    }

}