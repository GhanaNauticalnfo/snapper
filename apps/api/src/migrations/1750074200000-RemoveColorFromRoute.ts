import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveColorFromRoute1750074200000 implements MigrationInterface {
    name = 'RemoveColorFromRoute1750074200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "color"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "routes" ADD "color" character varying NOT NULL DEFAULT '#FF0000'`);
    }
}