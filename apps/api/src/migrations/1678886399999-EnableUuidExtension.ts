import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableUuidExtension1678886399999 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add this line to enable the extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        console.log("PostgreSQL extension 'uuid-ossp' enabled via migration.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Optional: Usually safe to leave the extension enabled.
        // await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp";`);
        console.log("Reverting EnableUuidExtension migration (down method).");
    }

}
