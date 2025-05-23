import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMarkersAndHazardsTables1738058000000 implements MigrationInterface {
    name = 'CreateMarkersAndHazardsTables1738058000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create markers table
        await queryRunner.query(`
            CREATE TABLE "markers" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "lat" double precision NOT NULL,
                "lng" double precision NOT NULL,
                "icon" character varying NOT NULL DEFAULT 'default',
                "color" character varying NOT NULL DEFAULT '#FF0000',
                "enabled" boolean NOT NULL DEFAULT true,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_markers" PRIMARY KEY ("id")
            )
        `);
        
        // Create hazards table
        await queryRunner.query(`
            CREATE TABLE "hazards" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "lat" double precision NOT NULL,
                "lng" double precision NOT NULL,
                "radius" double precision,
                "type" character varying NOT NULL DEFAULT 'warning',
                "color" character varying NOT NULL DEFAULT '#FFA500',
                "enabled" boolean NOT NULL DEFAULT true,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_hazards" PRIMARY KEY ("id")
            )
        `);
        
        // Create spatial indexes
        await queryRunner.query(`CREATE INDEX "IDX_markers_lat_lng" ON "markers" ("lat", "lng")`);
        await queryRunner.query(`CREATE INDEX "IDX_hazards_lat_lng" ON "hazards" ("lat", "lng")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_hazards_lat_lng"`);
        await queryRunner.query(`DROP INDEX "IDX_markers_lat_lng"`);
        await queryRunner.query(`DROP TABLE "hazards"`);
        await queryRunner.query(`DROP TABLE "markers"`);
    }
}