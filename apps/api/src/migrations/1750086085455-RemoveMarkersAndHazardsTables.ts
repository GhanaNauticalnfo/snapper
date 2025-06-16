import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveMarkersAndHazardsTables1750086085455 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the hazards table and its indexes
        await queryRunner.query(`DROP TABLE IF EXISTS "hazards" CASCADE`);
        
        // Drop the markers table and its indexes
        await queryRunner.query(`DROP TABLE IF EXISTS "markers" CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate markers table
        await queryRunner.query(`
            CREATE TABLE "markers" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "lat" double precision NOT NULL,
                "lng" double precision NOT NULL,
                "icon" character varying,
                "color" character varying,
                "enabled" boolean NOT NULL DEFAULT true,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_markers_id" PRIMARY KEY ("id")
            )
        `);
        
        // Create indexes for markers
        await queryRunner.query(`CREATE INDEX "IDX_markers_enabled" ON "markers" ("enabled")`);
        await queryRunner.query(`CREATE INDEX "IDX_markers_lat_lng" ON "markers" ("lat", "lng")`);
        
        // Recreate hazards table
        await queryRunner.query(`
            CREATE TABLE "hazards" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "lat" double precision NOT NULL,
                "lng" double precision NOT NULL,
                "radius" double precision NOT NULL DEFAULT 100,
                "type" character varying NOT NULL DEFAULT 'hazard',
                "color" character varying NOT NULL DEFAULT '#FFA500',
                "enabled" boolean NOT NULL DEFAULT true,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_hazards_id" PRIMARY KEY ("id")
            )
        `);
        
        // Create indexes for hazards
        await queryRunner.query(`CREATE INDEX "IDX_hazards_enabled" ON "hazards" ("enabled")`);
        await queryRunner.query(`CREATE INDEX "IDX_hazards_lat_lng" ON "hazards" ("lat", "lng")`);
    }

}
