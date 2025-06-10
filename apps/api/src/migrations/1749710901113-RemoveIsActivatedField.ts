import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveIsActivatedField1749710901113 implements MigrationInterface {
    name = 'RemoveIsActivatedField1749710901113';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove the is_activated column from devices table
        await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "is_activated"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back the is_activated column for rollback
        await queryRunner.query(`ALTER TABLE "devices" ADD "is_activated" boolean NOT NULL DEFAULT false`);
    }

}
