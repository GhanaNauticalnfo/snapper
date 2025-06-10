import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertMockVesselData1749236935695 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const mockVessels = [
            {
                name: 'Akosombo Explorer',
                registration_number: 'GH-001-AE',
                vessel_type: 'Passenger',
                length_meters: 25.5,
                owner_name: 'Lake Volta Transport Co.',
                owner_contact: '+233 20 123 4567',
                home_port: 'Akosombo',
                active: true,
                created: '2023-01-15T08:30:00',
                last_updated: '2024-01-15T08:30:00'
            },
            {
                name: 'Black Volta',
                registration_number: 'GH-002-BV',
                vessel_type: 'Cargo',
                length_meters: 30.0,
                owner_name: 'Ghana Maritime Services',
                owner_contact: '+233 24 234 5678',
                home_port: 'Akosombo',
                active: true,
                created: '2023-02-03T14:15:00',
                last_updated: '2024-02-03T14:15:00'
            },
            {
                name: 'Adomi Bridge Cruiser',
                registration_number: 'GH-003-ABC',
                vessel_type: 'Fishing',
                length_meters: 12.0,
                owner_name: 'Adomi Fishing Collective',
                owner_contact: '+233 26 345 6789',
                home_port: 'Adomi',
                active: true,
                created: '2023-02-17T11:45:00',
                last_updated: '2024-02-17T11:45:00'
            },
            {
                name: 'Accra Star',
                registration_number: 'GH-004-AS',
                vessel_type: 'Passenger',
                length_meters: 28.0,
                owner_name: 'Accra Marine Ltd.',
                owner_contact: '+233 30 456 7890',
                home_port: 'Tema',
                active: true,
                created: '2023-03-05T09:20:00',
                last_updated: '2024-03-05T09:20:00'
            },
            {
                name: 'Kumasi Queen',
                registration_number: 'GH-005-KQ',
                vessel_type: 'Passenger',
                length_meters: 35.0,
                owner_name: 'Ashanti Water Transport',
                owner_contact: '+233 32 567 8901',
                home_port: 'Kumasi',
                active: false,
                created: '2023-03-22T16:40:00',
                last_updated: '2024-03-22T16:40:00'
            }
        ];

        for (const vessel of mockVessels) {
            await queryRunner.query(`
                INSERT INTO vessel (name, registration_number, vessel_type, length_meters, owner_name, owner_contact, home_port, active, created, last_updated)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                vessel.name,
                vessel.registration_number,
                vessel.vessel_type,
                vessel.length_meters,
                vessel.owner_name,
                vessel.owner_contact,
                vessel.home_port,
                vessel.active,
                vessel.created,
                vessel.last_updated
            ]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM vessel WHERE registration_number IN ('GH-001-AE', 'GH-002-BV', 'GH-003-ABC', 'GH-004-AS', 'GH-005-KQ')`);
    }

}
