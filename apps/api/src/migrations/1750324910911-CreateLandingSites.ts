import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLandingSites1750324910911 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "landing_sites" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "location" geography(Point,4326) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_landing_sites" PRIMARY KEY ("id")
            )
        `);

        // Create spatial index on location
        await queryRunner.query(`
            CREATE INDEX "IDX_landing_sites_location" ON "landing_sites" USING GIST ("location")
        `);

        // Create index on enabled for filtering
        await queryRunner.query(`
            CREATE INDEX "IDX_landing_sites_enabled" ON "landing_sites" ("enabled")
        `);

        // Insert some sample landing sites
        await queryRunner.query(`
            INSERT INTO "landing_sites" ("name", "description", "location", "enabled") VALUES
            ('Tema Harbor Landing Site', 'Main landing site for fishing vessels at Tema harbor', ST_GeomFromText('POINT(-0.017 5.619)', 4326), true),
            ('Jamestown Landing Beach', 'Traditional fishing landing site at Jamestown', ST_GeomFromText('POINT(-0.209 5.541)', 4326), true),
            ('Elmina Landing Site', 'Historic fishing port landing site', ST_GeomFromText('POINT(-1.350 5.083)', 4326), true),
            ('Takoradi Harbor Landing', 'Commercial and fishing vessel landing site', ST_GeomFromText('POINT(-1.750 4.885)', 4326), true),
            ('Cape Coast Landing Beach', 'Artisanal fishing landing site', ST_GeomFromText('POINT(-1.246 5.106)', 4326), true),
            ('Ada Foah Landing Site', 'Landing site at the Volta River estuary', ST_GeomFromText('POINT(0.640 5.780)', 4326), true),
            ('Keta Landing Beach', 'Eastern coastal landing site', ST_GeomFromText('POINT(0.987 5.918)', 4326), true),
            ('Axim Landing Site', 'Western region fishing landing site', ST_GeomFromText('POINT(-2.240 4.866)', 4326), false)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_landing_sites_enabled"`);
        await queryRunner.query(`DROP INDEX "IDX_landing_sites_location"`);
        await queryRunner.query(`DROP TABLE "landing_sites"`);
    }

}
