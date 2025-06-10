import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSettingsTable1750074123986 implements MigrationInterface {
    name = 'CreateSettingsTable1750074123986'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" DROP CONSTRAINT "FK_vessel_telemetry_vessel_id"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT "FK_vessel_vessel_type"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT "FK_vessel_latest_position"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8457e7caaa4019467aef9ccf7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_vessel_latest_position_id"`);
        await queryRunner.query(`CREATE TABLE "settings" ("key" character varying NOT NULL, "value" character varying NOT NULL, "created" TIMESTAMP NOT NULL DEFAULT now(), "last_updated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`);
        await queryRunner.query(`INSERT INTO "settings" ("key", "value") VALUES ('route.color', '#FF0000')`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "vessel_telemetry_id_seq" OWNED BY "vessel_telemetry"."id"`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ALTER COLUMN "id" SET DEFAULT nextval('"vessel_telemetry_id_seq"')`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`CREATE INDEX "IDX_1b774d96431645e26257391593" ON "vessel_telemetry" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_3e5c63c7963b5175b2bc1a327d" ON "vessel_telemetry" USING GiST ("position") `);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ADD CONSTRAINT "FK_4a096b2c4bf962907f3dcdbc7e2" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vessel" ADD CONSTRAINT "FK_3a76de617773467a2f38a961a09" FOREIGN KEY ("vessel_type_id") REFERENCES "vessel_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vessel" ADD CONSTRAINT "FK_58b548f8d9caefb33d46b1b7d2b" FOREIGN KEY ("latest_position_id") REFERENCES "vessel_telemetry"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT "FK_58b548f8d9caefb33d46b1b7d2b"`);
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT "FK_3a76de617773467a2f38a961a09"`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" DROP CONSTRAINT "FK_4a096b2c4bf962907f3dcdbc7e2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3e5c63c7963b5175b2bc1a327d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b774d96431645e26257391593"`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ALTER COLUMN "id" SET DEFAULT nextval('tracking_point_id_seq')`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "vessel_telemetry_id_seq"`);
        await queryRunner.query(`DELETE FROM "settings" WHERE "key" = 'route.color'`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`CREATE INDEX "IDX_vessel_latest_position_id" ON "vessel" ("latest_position_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e8457e7caaa4019467aef9ccf7" ON "vessel_telemetry" USING GiST ("position") `);
        await queryRunner.query(`ALTER TABLE "vessel" ADD CONSTRAINT "FK_vessel_latest_position" FOREIGN KEY ("latest_position_id") REFERENCES "vessel_telemetry"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vessel" ADD CONSTRAINT "FK_vessel_vessel_type" FOREIGN KEY ("vessel_type_id") REFERENCES "vessel_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vessel_telemetry" ADD CONSTRAINT "FK_vessel_telemetry_vessel_id" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
