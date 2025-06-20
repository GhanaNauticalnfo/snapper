import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveBrandFromVessels1750660341569 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the foreign key constraint first
        await queryRunner.query(`ALTER TABLE "vessel" DROP CONSTRAINT IF EXISTS "FK_vessel_brand_id"`);
        
        // Drop the brand_id column
        await queryRunner.query(`ALTER TABLE "vessel" DROP COLUMN IF EXISTS "brand_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add the brand_id column
        await queryRunner.query(`ALTER TABLE "vessel" ADD COLUMN "brand_id" integer`);
        
        // Note: We don't recreate the brand table or foreign key since 
        // the brand entity has been removed from the codebase
    }

}
