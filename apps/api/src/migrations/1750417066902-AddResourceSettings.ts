import { MigrationInterface, QueryRunner, Table, Index } from "typeorm";

export class AddResourceSettings1750417066902 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create setting_types table
        await queryRunner.createTable(new Table({
            name: "setting_types",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "resource_type",
                    type: "varchar",
                    length: "50"
                },
                {
                    name: "setting_key",
                    type: "varchar",
                    length: "10"
                },
                {
                    name: "display_name",
                    type: "varchar",
                    length: "100"
                },
                {
                    name: "data_type",
                    type: "varchar",
                    length: "20",
                    default: "'string'"
                },
                {
                    name: "is_required",
                    type: "boolean",
                    default: false
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ],
            uniques: [
                {
                    name: "UQ_setting_types_resource_type_setting_key",
                    columnNames: ["resource_type", "setting_key"]
                }
            ],
            indices: [
                {
                    name: "IDX_setting_types_resource_type",
                    columnNames: ["resource_type"]
                }
            ]
        }), true);

        // Create resource_settings table
        await queryRunner.createTable(new Table({
            name: "resource_settings",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "resource_type",
                    type: "varchar",
                    length: "50"
                },
                {
                    name: "resource_id",
                    type: "int"
                },
                {
                    name: "setting_key",
                    type: "varchar",
                    length: "10"
                },
                {
                    name: "value",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ],
            uniques: [
                {
                    name: "UQ_resource_settings_composite",
                    columnNames: ["resource_type", "resource_id", "setting_key"]
                }
            ],
            indices: [
                {
                    name: "IDX_resource_settings_resource",
                    columnNames: ["resource_type", "resource_id"]
                }
            ],
            foreignKeys: [
                {
                    name: "FK_resource_settings_setting_type",
                    columnNames: ["resource_type", "setting_key"],
                    referencedTableName: "setting_types",
                    referencedColumnNames: ["resource_type", "setting_key"],
                    onDelete: "CASCADE"
                }
            ]
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop resource_settings table
        await queryRunner.dropTable("resource_settings");
        
        // Drop setting_types table
        await queryRunner.dropTable("setting_types");
    }

}
