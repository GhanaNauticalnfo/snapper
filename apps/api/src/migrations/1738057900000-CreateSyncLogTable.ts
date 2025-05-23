import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSyncLogTable1738057900000 implements MigrationInterface {
    name = 'CreateSyncLogTable1738057900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "sync_log" (
                "id" SERIAL NOT NULL,
                "entity_type" character varying(50) NOT NULL,
                "entity_id" character varying(100) NOT NULL,
                "action" character varying(20) NOT NULL,
                "data" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "is_latest" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_sync_log" PRIMARY KEY ("id")
            )
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_sync_log_created_at_is_latest" 
            ON "sync_log" ("created_at", "is_latest") 
            WHERE is_latest = true
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_sync_log_entity_id_type_latest" 
            ON "sync_log" ("entity_id", "entity_type", "is_latest")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_sync_log_entity_id_type_latest"`);
        await queryRunner.query(`DROP INDEX "IDX_sync_log_created_at_is_latest"`);
        await queryRunner.query(`DROP TABLE "sync_log"`);
    }
}