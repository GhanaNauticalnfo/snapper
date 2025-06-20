import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateLandingSitesTable1750329172815 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, drop the existing table to recreate it with the new schema
        await queryRunner.query(`DROP TABLE IF EXISTS "landing_sites" CASCADE`);

        // Create the landing_sites table with the requested schema
        await queryRunner.query(`
            CREATE TABLE "landing_sites" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "location" geography(Point,4326) NOT NULL,
                "status" character varying NOT NULL DEFAULT 'active',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_landing_sites" PRIMARY KEY ("id")
            )
        `);

        // Create spatial index on location
        await queryRunner.query(`
            CREATE INDEX "IDX_landing_sites_location" ON "landing_sites" USING GIST ("location")
        `);

        // Create index on status for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_landing_sites_status" ON "landing_sites" ("status")
        `);

        // Seed sample landing sites along Ghana's coast with realistic coordinates
        await queryRunner.query(`
            INSERT INTO "landing_sites" ("name", "description", "location", "status") VALUES
            ('Tema Fishing Harbor', 'Major commercial fishing harbor with modern facilities and ice plants', ST_GeomFromText('POINT(0.0167 5.6194)', 4326), 'active'),
            ('Jamestown Landing Beach', 'Traditional fishing community landing site in Accra with daily fish market', ST_GeomFromText('POINT(-0.2090 5.5410)', 4326), 'active'),
            ('Elmina Fishing Port', 'Historic fishing port near Elmina Castle with artisanal fishing fleet', ST_GeomFromText('POINT(-1.3500 5.0830)', 4326), 'active'),
            ('Takoradi Fishing Harbor', 'Deep water harbor serving both commercial and artisanal fishing vessels', ST_GeomFromText('POINT(-1.7500 4.8850)', 4326), 'active'),
            ('Cape Coast Landing Beach', 'Busy artisanal fishing landing site with traditional canoes', ST_GeomFromText('POINT(-1.2460 5.1060)', 4326), 'active'),
            ('Ada Foah Estuary Landing', 'Landing site at Volta River mouth, known for shrimp and tilapia', ST_GeomFromText('POINT(0.6400 5.7800)', 4326), 'active'),
            ('Keta Lagoon Landing', 'Eastern coastal site specializing in lagoon and marine fishing', ST_GeomFromText('POINT(0.9870 5.9180)', 4326), 'active'),
            ('Axim Beach Landing', 'Western region landing site for tuna and pelagic fish', ST_GeomFromText('POINT(-2.2400 4.8660)', 4326), 'active'),
            ('Winneba Landing Beach', 'Central region site famous for seasonal sardinella fishing', ST_GeomFromText('POINT(-0.6230 5.3510)', 4326), 'active'),
            ('Sekondi Naval Base Landing', 'Controlled access landing site near naval installations', ST_GeomFromText('POINT(-1.7030 4.9340)', 4326), 'restricted'),
            ('Half Assini Landing', 'Border town landing site near Côte d''Ivoire', ST_GeomFromText('POINT(-2.8920 5.0480)', 4326), 'active'),
            ('Prampram Landing Beach', 'Growing fishing community east of Accra', ST_GeomFromText('POINT(0.1140 5.7020)', 4326), 'active'),
            ('Shama Landing Site', 'Small fishing village landing between Takoradi and Cape Coast', ST_GeomFromText('POINT(-1.6080 5.0170)', 4326), 'active'),
            ('Abandze Landing Beach', 'Artisanal fishing site with traditional fish smoking', ST_GeomFromText('POINT(-1.1200 5.1230)', 4326), 'active'),
            ('Denu Border Landing', 'Eastern frontier landing site near Togo border', ST_GeomFromText('POINT(1.1340 5.9880)', 4326), 'inactive')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_landing_sites_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_landing_sites_location"`);
        
        // Drop the table
        await queryRunner.query(`DROP TABLE IF EXISTS "landing_sites"`);

        // Recreate the original table structure
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

        // Recreate original indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_landing_sites_location" ON "landing_sites" USING GIST ("location")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_landing_sites_enabled" ON "landing_sites" ("enabled")
        `);

        // Restore original data
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

}
