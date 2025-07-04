import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1752000000000 implements MigrationInterface {
    name = 'InitialSchema1752000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create vessel_type table (uses created_at/updated_at)
        await queryRunner.query(`
            CREATE TABLE "vessel_type" (
                "id" SERIAL NOT NULL,
                "name" character varying(30) NOT NULL,
                "color" character varying DEFAULT '#3B82F6',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_vessel_type_name" UNIQUE ("name"),
                CONSTRAINT "PK_vessel_type" PRIMARY KEY ("id")
            )
        `);

        // Create vessel table (uses created/last_updated)
        await queryRunner.query(`
            CREATE TABLE "vessel" (
                "id" SERIAL NOT NULL,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                "name" character varying(255) NOT NULL,
                "call_sign" character varying,
                "mmsi" integer,
                "imo" integer,
                "vessel_type_id" integer NOT NULL DEFAULT 1,
                "latest_position_id" integer,
                CONSTRAINT "UQ_vessel_mmsi" UNIQUE ("mmsi"),
                CONSTRAINT "UQ_vessel_imo" UNIQUE ("imo"),
                CONSTRAINT "PK_vessel" PRIMARY KEY ("id")
            )
        `);

        // Create vessel_telemetry table (uses created)
        await queryRunner.query(`
            CREATE TABLE "vessel_telemetry" (
                "id" SERIAL NOT NULL,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
                "vessel_id" integer NOT NULL,
                "position" geography(Point,4326) NOT NULL,
                "speed_knots" numeric(5,2),
                "heading_degrees" numeric(5,1),
                "battery_level" integer,
                "signal_strength" integer,
                "device_id" character varying(50),
                "status" character varying(20),
                CONSTRAINT "PK_vessel_telemetry" PRIMARY KEY ("id")
            )
        `);

        // Create devices table
        await queryRunner.query(`
            CREATE TYPE "public"."devices_state_enum" AS ENUM('pending', 'active', 'retired')
        `);
        await queryRunner.query(`
            CREATE TABLE "devices" (
                "device_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "device_token" character varying NOT NULL,
                "activation_token" character varying NOT NULL,
                "auth_token" character varying,
                "state" "public"."devices_state_enum" NOT NULL DEFAULT 'pending',
                "activated_at" TIMESTAMP,
                "expires_at" TIMESTAMP,
                "vessel_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_devices_device_token" UNIQUE ("device_token"),
                CONSTRAINT "UQ_devices_activation_token" UNIQUE ("activation_token"),
                CONSTRAINT "PK_devices" PRIMARY KEY ("device_id")
            )
        `);

        // Create routes table (uses created/last_updated)
        await queryRunner.query(`
            CREATE TABLE "routes" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "waypoints" jsonb NOT NULL DEFAULT '[]',
                "enabled" boolean NOT NULL DEFAULT true,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_routes" PRIMARY KEY ("id")
            )
        `);

        // Create kml_dataset table (uses created/last_updated)
        await queryRunner.query(`
            CREATE TABLE "kml_dataset" (
                "id" SERIAL NOT NULL,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                "kml" text,
                "name" character varying(255),
                "enabled" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_kml_dataset" PRIMARY KEY ("id")
            )
        `);

        // Create sync_version table (has id and is_current)
        await queryRunner.query(`
            CREATE TABLE "sync_version" (
                "id" SERIAL NOT NULL,
                "major_version" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "is_current" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_sync_version_major" UNIQUE ("major_version"),
                CONSTRAINT "PK_sync_version" PRIMARY KEY ("id")
            )
        `);

        // Create sync_log table
        await queryRunner.query(`
            CREATE TABLE "sync_log" (
                "id" SERIAL NOT NULL,
                "entity_type" character varying(50) NOT NULL,
                "entity_id" character varying(100) NOT NULL,
                "action" character varying(20) NOT NULL,
                "data" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "is_latest" boolean NOT NULL DEFAULT true,
                "major_version" integer NOT NULL,
                CONSTRAINT "PK_sync_log" PRIMARY KEY ("id")
            )
        `);

        // Create volta_depth_tile table
        await queryRunner.query(`
            CREATE TABLE "volta_depth_tile" (
                "id" SERIAL NOT NULL,
                "zoom" integer NOT NULL,
                "x" integer NOT NULL,
                "y" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_volta_depth_tile_coords" UNIQUE ("zoom", "x", "y"),
                CONSTRAINT "PK_volta_depth_tile" PRIMARY KEY ("id")
            )
        `);

        // Create volta_depth_tile_feature table
        await queryRunner.query(`
            CREATE TABLE "volta_depth_tile_feature" (
                "id" SERIAL NOT NULL,
                "tile_id" integer NOT NULL,
                "properties" jsonb NOT NULL,
                "geometry" jsonb NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_volta_depth_tile_feature" PRIMARY KEY ("id")
            )
        `);

        // Create tree_stub_group table
        await queryRunner.query(`
            CREATE TABLE "tree_stub_group" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tree_stub_group" PRIMARY KEY ("id")
            )
        `);

        // Create tree_stubs table (plural!)
        await queryRunner.query(`
            CREATE TABLE "tree_stubs" (
                "id" SERIAL NOT NULL,
                "group_id" integer NOT NULL,
                "geometry" geography(Geometry,4326) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tree_stubs" PRIMARY KEY ("id")
            )
        `);

        // Create landing_sites table
        await queryRunner.query(`
            CREATE TABLE "landing_sites" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" character varying,
                "location" geography(Point,4326) NOT NULL,
                "status" character varying DEFAULT 'active',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_landing_sites" PRIMARY KEY ("id")
            )
        `);

        // Create settings table (uses created/last_updated)
        await queryRunner.query(`
            CREATE TABLE "settings" (
                "key" character varying NOT NULL,
                "value" character varying NOT NULL,
                "created" TIMESTAMP NOT NULL DEFAULT now(),
                "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_settings" PRIMARY KEY ("key")
            )
        `);

        // Create setting_types table (plural)
        await queryRunner.query(`
            CREATE TABLE "setting_types" (
                "id" SERIAL NOT NULL,
                "resource_type" character varying(50) NOT NULL,
                "setting_key" character varying(10) NOT NULL,
                "display_name" character varying(100) NOT NULL,
                "data_type" character varying(20) NOT NULL DEFAULT 'string',
                "is_required" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_setting_types" UNIQUE ("resource_type", "setting_key"),
                CONSTRAINT "PK_setting_types" PRIMARY KEY ("id")
            )
        `);

        // Create resource_settings table (plural)
        await queryRunner.query(`
            CREATE TABLE "resource_settings" (
                "id" SERIAL NOT NULL,
                "resource_type" character varying(50) NOT NULL,
                "resource_id" integer NOT NULL,
                "setting_key" character varying(10) NOT NULL,
                "value" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_resource_settings" UNIQUE ("resource_type", "resource_id", "setting_key"),
                CONSTRAINT "PK_resource_settings" PRIMARY KEY ("id")
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_vessel_telemetry_vessel_id" ON "vessel_telemetry" ("vessel_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_vessel_telemetry_position" ON "vessel_telemetry" USING GIST ("position")`);
        await queryRunner.query(`CREATE INDEX "IDX_vessel_telemetry_timestamp" ON "vessel_telemetry" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "IDX_devices_vessel_id" ON "devices" ("vessel_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_sync_log_created_latest" ON "sync_log" ("created_at", "is_latest") WHERE "is_latest" = true`);
        await queryRunner.query(`CREATE INDEX "IDX_sync_log_entity" ON "sync_log" ("entity_id", "entity_type", "is_latest")`);
        await queryRunner.query(`CREATE INDEX "IDX_sync_log_version" ON "sync_log" ("major_version", "created_at", "is_latest") WHERE "is_latest" = true`);
        await queryRunner.query(`CREATE INDEX "IDX_volta_depth_tile_feature_tile_id" ON "volta_depth_tile_feature" ("tile_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_tree_stubs_geometry" ON "tree_stubs" USING GIST ("geometry")`);
        await queryRunner.query(`CREATE INDEX "IDX_tree_stubs_group_id" ON "tree_stubs" ("group_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_landing_sites_location" ON "landing_sites" USING GIST ("location")`);
        await queryRunner.query(`CREATE INDEX "IDX_resource_settings_resource" ON "resource_settings" ("resource_type", "resource_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_setting_types_resource_type" ON "setting_types" ("resource_type")`);

        // Add foreign keys
        await queryRunner.query(`
            ALTER TABLE "vessel" 
            ADD CONSTRAINT "FK_vessel_vessel_type" 
            FOREIGN KEY ("vessel_type_id") REFERENCES "vessel_type"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "vessel" 
            ADD CONSTRAINT "FK_vessel_latest_position" 
            FOREIGN KEY ("latest_position_id") REFERENCES "vessel_telemetry"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "vessel_telemetry" 
            ADD CONSTRAINT "FK_vessel_telemetry_vessel" 
            FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Note: device_id in vessel_telemetry is varchar(50), not a foreign key to devices table

        await queryRunner.query(`
            ALTER TABLE "devices" 
            ADD CONSTRAINT "FK_devices_vessel" 
            FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "sync_log" 
            ADD CONSTRAINT "FK_sync_log_version" 
            FOREIGN KEY ("major_version") REFERENCES "sync_version"("major_version") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "volta_depth_tile_feature" 
            ADD CONSTRAINT "FK_volta_depth_tile_feature_tile" 
            FOREIGN KEY ("tile_id") REFERENCES "volta_depth_tile"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "tree_stubs" 
            ADD CONSTRAINT "FK_tree_stubs_group" 
            FOREIGN KEY ("group_id") REFERENCES "tree_stub_group"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Note: resource_settings doesn't have a foreign key to setting_type in the entity
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "tree_stubs" DROP CONSTRAINT "FK_tree_stubs_group"`);
        await queryRunner.query(`ALTER TABLE "volta_depth_tile_feature" DROP CONSTRAINT "FK_volta_depth_tile_feature_tile"`);
        await queryRunner.query(`ALTER TABLE "sync_log" DROP CONSTRAINT "FK_sync_log_version"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_devices_vessel"`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" DROP CONSTRAINT "FK_vessel_telemetry_vessel"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT "FK_vessel_latest_position"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT "FK_vessel_vessel_type"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_setting_types_resource_type"`);
        await queryRunner.query(`DROP INDEX "IDX_resource_settings_resource"`);
        await queryRunner.query(`DROP INDEX "IDX_landing_sites_location"`);
        await queryRunner.query(`DROP INDEX "IDX_tree_stubs_group_id"`);
        await queryRunner.query(`DROP INDEX "IDX_tree_stubs_geometry"`);
        await queryRunner.query(`DROP INDEX "IDX_volta_depth_tile_feature_tile_id"`);
        await queryRunner.query(`DROP INDEX "IDX_sync_log_version"`);
        await queryRunner.query(`DROP INDEX "IDX_sync_log_entity"`);
        await queryRunner.query(`DROP INDEX "IDX_sync_log_created_latest"`);
        await queryRunner.query(`DROP INDEX "IDX_devices_vessel_id"`);
        await queryRunner.query(`DROP INDEX "IDX_vessel_telemetry_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_vessel_telemetry_position"`);
        await queryRunner.query(`DROP INDEX "IDX_vessel_telemetry_vessel_id"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "resource_settings"`);
        await queryRunner.query(`DROP TABLE "setting_types"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP TABLE "landing_sites"`);
        await queryRunner.query(`DROP TABLE "tree_stubs"`);
        await queryRunner.query(`DROP TABLE "tree_stub_group"`);
        await queryRunner.query(`DROP TABLE "volta_depth_tile_feature"`);
        await queryRunner.query(`DROP TABLE "volta_depth_tile"`);
        await queryRunner.query(`DROP TABLE "sync_log"`);
        await queryRunner.query(`DROP TABLE "sync_version"`);
        await queryRunner.query(`DROP TABLE "kml_dataset"`);
        await queryRunner.query(`DROP TABLE "routes"`);
        await queryRunner.query(`DROP TABLE "devices"`);
        await queryRunner.query(`DROP TYPE "public"."devices_state_enum"`);
        await queryRunner.query(`DROP TABLE "vessel_telemetry"`);
        await queryRunner.query(`DROP TABLE "vessel"`);
        await queryRunner.query(`DROP TABLE "vessel_type"`);
    }
}