import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVesselAndTrackingTables1700000000000 implements MigrationInterface {
    name = 'CreateVesselAndTrackingTables1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create vessel table
        await queryRunner.query(`CREATE TABLE "vessel" ("id" SERIAL NOT NULL, "created" TIMESTAMP NOT NULL DEFAULT now(), "last_updated" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "registration_number" character varying(50) NOT NULL, "vessel_type" character varying(50) NOT NULL, "length_meters" numeric(5,2), "owner_name" character varying(255), "owner_contact" character varying(255), "home_port" character varying(100), "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_07d70b325a80c7c486385061553" UNIQUE ("registration_number"), CONSTRAINT "PK_87cc5d99bd07c65028ddcc9c785" PRIMARY KEY ("id"))`);
        
        // Create tracking_point table
        await queryRunner.query(`CREATE TABLE "tracking_point" ("id" SERIAL NOT NULL, "created" TIMESTAMP NOT NULL DEFAULT now(), "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "vessel_id" integer NOT NULL, "position" geography(Point,4326) NOT NULL, "speed_knots" numeric(5,2), "heading_degrees" numeric(5,1), "battery_level" integer, "signal_strength" integer, "device_id" character varying(50), "status" character varying(20), CONSTRAINT "PK_b78a5c4bc5ae07cb81fb48e63e0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e8457e7caaa4019467aef9ccf7" ON "tracking_point" USING GiST ("position") `);
        
        // Create devices table
        await queryRunner.query(`CREATE TABLE "devices" ("device_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "device_token" character varying NOT NULL, "activation_token" character varying NOT NULL, "auth_token" character varying, "is_activated" boolean NOT NULL DEFAULT false, "activated_at" TIMESTAMP, "expires_at" TIMESTAMP, "vessel_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a63867095088b891e2c5d68ec24" UNIQUE ("device_token"), CONSTRAINT "UQ_e4ff9e264c31d9c2116da15c4ff" UNIQUE ("activation_token"), CONSTRAINT "PK_2667f40edb344d6f274a0d42b6f" PRIMARY KEY ("device_id"))`);
        
        // Create routes table
        await queryRunner.query(`CREATE TABLE "routes" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "waypoints" jsonb NOT NULL DEFAULT '[]', "color" character varying NOT NULL DEFAULT '#FF0000', "enabled" boolean NOT NULL DEFAULT true, "created" TIMESTAMP NOT NULL DEFAULT now(), "last_updated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY ("id"))`);
        
        // Create kml_dataset table  
        await queryRunner.query(`CREATE TABLE "kml_dataset" ("id" SERIAL NOT NULL, "created" TIMESTAMP NOT NULL DEFAULT now(), "last_updated" TIMESTAMP NOT NULL DEFAULT now(), "kml" text, "name" character varying(255), "enabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_0dbadf12b11bc5e170158cec120" PRIMARY KEY ("id"))`);
        
        // Create sync_log table
        await queryRunner.query(`CREATE TABLE "sync_log" ("id" SERIAL NOT NULL, "entity_type" character varying(50) NOT NULL, "entity_id" character varying(100) NOT NULL, "action" character varying(20) NOT NULL, "data" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "is_latest" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5a1c2f181ab99c0757868c7d0fc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_95245e1a9768887cf57e466f93" ON "sync_log" ("entity_id", "entity_type", "is_latest") `);
        await queryRunner.query(`CREATE INDEX "IDX_541fc213fb836e14e8df5fbfb2" ON "sync_log" ("created_at", "is_latest") WHERE is_latest = true`);
        
        // Create volta depth tables
        await queryRunner.query(`CREATE TABLE "volta_depth_tile" ("id" character varying(10) NOT NULL, "numberOfFeatures" integer NOT NULL, "created" TIMESTAMP NOT NULL DEFAULT now(), "lastUpdated" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_13e05ee8fe91de6aa019ea4b0cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "volta_depth_tile_feature" ("id" SERIAL NOT NULL, "fid" bigint, "groupCode" integer, "description" text, "geom" geometry(MultiPolygon,4326) NOT NULL, "tileId" character varying(10) NOT NULL, CONSTRAINT "PK_96809c2e72320ad431e323701f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_00ed61b3b32ba40cca32363b1e" ON "volta_depth_tile_feature" ("fid") `);
        await queryRunner.query(`CREATE INDEX "volta_depth_tile_feature_geom_idx" ON "volta_depth_tile_feature" USING GiST ("geom") `);
        
        // Add foreign key constraints
        await queryRunner.query(`ALTER TABLE "tracking_point" ADD CONSTRAINT "FK_a6aed8aa8012cff8c90f88508fb" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "devices" ADD CONSTRAINT "FK_a84b73ae2a2a38ec08ecb8337f5" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "volta_depth_tile_feature" ADD CONSTRAINT "FK_1986f60f093cb0ce6243dd0bf0c" FOREIGN KEY ("tileId") REFERENCES "volta_depth_tile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints first
        await queryRunner.query(`ALTER TABLE "volta_depth_tile_feature" DROP CONSTRAINT "FK_1986f60f093cb0ce6243dd0bf0c"`);
        await queryRunner.query(`ALTER TABLE "devices" DROP CONSTRAINT "FK_a84b73ae2a2a38ec08ecb8337f5"`);
        await queryRunner.query(`ALTER TABLE "tracking_point" DROP CONSTRAINT "FK_a6aed8aa8012cff8c90f88508fb"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."volta_depth_tile_feature_geom_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_00ed61b3b32ba40cca32363b1e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_541fc213fb836e14e8df5fbfb2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95245e1a9768887cf57e466f93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8457e7caaa4019467aef9ccf7"`);
        
        // Drop tables
        await queryRunner.query(`DROP TABLE "volta_depth_tile_feature"`);
        await queryRunner.query(`DROP TABLE "volta_depth_tile"`);
        await queryRunner.query(`DROP TABLE "sync_log"`);
        await queryRunner.query(`DROP TABLE "kml_dataset"`);
        await queryRunner.query(`DROP TABLE "routes"`);
        await queryRunner.query(`DROP TABLE "devices"`);
        await queryRunner.query(`DROP TABLE "tracking_point"`);
        await queryRunner.query(`DROP TABLE "vessel"`);
    }

}
