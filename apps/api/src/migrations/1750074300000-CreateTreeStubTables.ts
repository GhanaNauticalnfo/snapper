import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTreeStubTables1750074300000 implements MigrationInterface {
    name = 'CreateTreeStubTables1750074300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create tree_stub_groups table
        await queryRunner.query(`
            CREATE TABLE "tree_stub_groups" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tree_stub_groups" PRIMARY KEY ("id")
            )
        `);

        // Create tree_stubs table
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

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "tree_stubs" 
            ADD CONSTRAINT "FK_tree_stubs_group_id" 
            FOREIGN KEY ("group_id") REFERENCES "tree_stub_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Create spatial index for geometry
        await queryRunner.query(`
            CREATE INDEX "IDX_tree_stubs_geometry" ON "tree_stubs" USING GIST ("geometry")
        `);

        // Insert sample data
        await queryRunner.query(`
            INSERT INTO "tree_stub_groups" ("name", "enabled") VALUES 
            ('Volta Lake North', true),
            ('Volta Lake Central', true),
            ('Volta Lake South', false)
        `);

        // Insert sample tree stubs (points and polygons)
        await queryRunner.query(`
            INSERT INTO "tree_stubs" ("group_id", "geometry") VALUES 
            (1, ST_GeogFromText('POINT(-0.0366 6.5833)')),
            (1, ST_GeogFromText('POINT(-0.0400 6.5900)')),
            (1, ST_GeogFromText('POLYGON((-0.0500 6.6000, -0.0480 6.6000, -0.0480 6.6020, -0.0500 6.6020, -0.0500 6.6000))')),
            (2, ST_GeogFromText('POINT(-0.0300 6.5500)')),
            (2, ST_GeogFromText('POLYGON((-0.0350 6.5400, -0.0330 6.5400, -0.0330 6.5420, -0.0350 6.5420, -0.0350 6.5400))'))
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_tree_stubs_geometry"`);
        await queryRunner.query(`ALTER TABLE "tree_stubs" DROP CONSTRAINT "FK_tree_stubs_group_id"`);
        await queryRunner.query(`DROP TABLE "tree_stubs"`);
        await queryRunner.query(`DROP TABLE "tree_stub_groups"`);
    }
}