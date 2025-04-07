// apps/api/src/migrations/1678886400000-CreateUserTable.ts
import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUserTable1678886400000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log("Applying migration: CreateUserTable");
        // Option 1: Using TypeORM's Table builder
        await queryRunner.createTable(new Table({
            name: "user", // Table name
            columns: [
                {
                    name: "id",
                    type: "uuid", // Or int, serial, etc.
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    isGenerated: true,
                },
                {
                    name: "email",
                    type: "varchar",
                    isUnique: true,
                    isNullable: false,
                },
                {
                    name: "password_hash",
                    type: "varchar",
                    isNullable: false,
                },
                {
                    name: "created_at",
                    type: "timestamp with time zone", // Use appropriate type
                    default: "CURRENT_TIMESTAMP",
                    isNullable: false,
                },
            ],
        }), true); // true creates foreign keys if defined in Table object

        // Option 2: Using Raw SQL (Example for adding an index)
        await queryRunner.query(`CREATE INDEX "idx_user_email" ON "user" ("email")`);
        console.log("Migration CreateUserTable applied successfully.");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log("Reverting migration: CreateUserTable");
        // Revert using raw SQL
        await queryRunner.query(`DROP INDEX "idx_user_email"`);

        // Revert using TypeORM method
        await queryRunner.dropTable("user");
        console.log("Migration CreateUserTable reverted successfully.");
    }
}