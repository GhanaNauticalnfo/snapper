import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameRouteDescriptionToNotes1751961686713 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "routes" RENAME COLUMN "description" TO "notes"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "routes" RENAME COLUMN "notes" TO "description"`);
    }

}
