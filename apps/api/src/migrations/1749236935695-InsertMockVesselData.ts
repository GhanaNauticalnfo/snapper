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
            },
            {
                name: 'Cape Coast Navigator',
                registration_number: 'GH-006-CCN',
                vessel_type: 'Fishing',
                length_meters: 15.0,
                owner_name: 'Cape Coast Fishermen',
                owner_contact: '+233 33 678 9012',
                home_port: 'Cape Coast',
                active: true,
                created: '2023-04-10T07:55:00',
                last_updated: '2024-04-10T07:55:00'
            },
            {
                name: 'Volta Lake Transporter',
                registration_number: 'GH-007-VLT',
                vessel_type: 'Cargo',
                length_meters: 40.0,
                owner_name: 'Volta Transport Corp.',
                owner_contact: '+233 34 789 0123',
                home_port: 'Akosombo',
                active: true,
                created: '2023-04-28T13:10:00',
                last_updated: '2024-04-28T13:10:00'
            },
            {
                name: 'Ghana Pride',
                registration_number: 'GH-008-GP',
                vessel_type: 'Passenger',
                length_meters: 32.0,
                owner_name: 'Ghana Pride Marine',
                owner_contact: '+233 50 890 1234',
                home_port: 'Tema',
                active: true,
                created: '2023-05-15T10:25:00',
                last_updated: '2024-05-15T10:25:00'
            },
            {
                name: 'Tamale Fisher',
                registration_number: 'GH-009-TF',
                vessel_type: 'Fishing',
                length_meters: 8.0,
                owner_name: 'Northern Fishermen Union',
                owner_contact: '+233 37 901 2345',
                home_port: 'Tamale',
                active: false,
                created: '2023-06-02T15:50:00',
                last_updated: '2024-06-02T15:50:00'
            },
            {
                name: 'Kwame Nkrumah',
                registration_number: 'GH-010-KN',
                vessel_type: 'Passenger',
                length_meters: 45.0,
                owner_name: 'Nkrumah Memorial Transport',
                owner_contact: '+233 54 012 3456',
                home_port: 'Accra',
                active: true,
                created: '2023-06-20T08:15:00',
                last_updated: '2024-06-20T08:15:00'
            },
            {
                name: 'Elmina Trader',
                registration_number: 'GH-011-ET',
                vessel_type: 'Cargo',
                length_meters: 22.0,
                owner_name: 'Elmina Trading Co.',
                owner_contact: '+233 55 123 4567',
                home_port: 'Elmina',
                active: true,
                created: '2023-07-07T12:30:00',
                last_updated: '2024-07-07T12:30:00'
            },
            {
                name: 'Keta Adventurer',
                registration_number: 'GH-012-KA',
                vessel_type: 'Fishing',
                length_meters: 10.0,
                owner_name: 'Keta Fishing Association',
                owner_contact: '+233 56 234 5678',
                home_port: 'Keta',
                active: true,
                created: '2023-07-25T09:45:00',
                last_updated: '2024-07-25T09:45:00'
            },
            {
                name: 'Takoradi Express',
                registration_number: 'GH-013-TE',
                vessel_type: 'Passenger',
                length_meters: 38.0,
                owner_name: 'Western Express Marine',
                owner_contact: '+233 57 345 6789',
                home_port: 'Takoradi',
                active: false,
                created: '2023-08-12T14:00:00',
                last_updated: '2024-08-12T14:00:00'
            },
            {
                name: 'Volta Dam Surveyor',
                registration_number: 'GH-014-VDS',
                vessel_type: 'Other',
                length_meters: 18.0,
                owner_name: 'Volta River Authority',
                owner_contact: '+233 58 456 7890',
                home_port: 'Akosombo',
                active: true,
                created: '2023-08-30T11:20:00',
                last_updated: '2024-08-30T11:20:00'
            },
            {
                name: 'Ashanti Explorer',
                registration_number: 'GH-015-AE2',
                vessel_type: 'Fishing',
                length_meters: 14.0,
                owner_name: 'Ashanti Fishermen Group',
                owner_contact: '+233 59 567 8901',
                home_port: 'Kumasi',
                active: true,
                created: '2023-09-17T10:35:00',
                last_updated: '2024-09-17T10:35:00'
            },
            {
                name: 'Ho Voyager',
                registration_number: 'GH-016-HV',
                vessel_type: 'Passenger',
                length_meters: 26.0,
                owner_name: 'Ho Marine Services',
                owner_contact: '+233 31 678 9012',
                home_port: 'Ho',
                active: true,
                created: '2023-10-05T16:50:00',
                last_updated: '2024-10-05T16:50:00'
            },
            {
                name: 'Yeji Ferry',
                registration_number: 'GH-017-YF',
                vessel_type: 'Passenger',
                length_meters: 50.0,
                owner_name: 'Yeji Ferry Services',
                owner_contact: '+233 38 789 0123',
                home_port: 'Yeji',
                active: false,
                created: '2023-10-23T08:05:00',
                last_updated: '2024-10-23T08:05:00'
            },
            {
                name: 'Afram Plains Fisher',
                registration_number: 'GH-018-APF',
                vessel_type: 'Fishing',
                length_meters: 9.0,
                owner_name: 'Afram Plains Fishermen',
                owner_contact: '+233 27 890 1234',
                home_port: 'Afram Plains',
                active: true,
                created: '2023-11-10T13:25:00',
                last_updated: '2024-11-10T13:25:00'
            },
            {
                name: 'Tema Harvester',
                registration_number: 'GH-019-TH',
                vessel_type: 'Fishing',
                length_meters: 20.0,
                owner_name: 'Tema Fishing Corporation',
                owner_contact: '+233 28 901 2345',
                home_port: 'Tema',
                active: true,
                created: '2023-11-28T10:40:00',
                last_updated: '2024-11-28T10:40:00'
            },
            {
                name: 'Dodi Island Transporter',
                registration_number: 'GH-020-DIT',
                vessel_type: 'Cargo',
                length_meters: 16.0,
                owner_name: 'Dodi Island Services',
                owner_contact: '+233 29 012 3456',
                home_port: 'Dodi Island',
                active: true,
                created: '2023-12-15T15:55:00',
                last_updated: '2024-12-15T15:55:00'
            },
            {
                name: 'Akosombo Fisher',
                registration_number: 'GH-021-AF',
                vessel_type: 'Fishing',
                length_meters: 11.0,
                owner_name: 'Akosombo Fishing Cooperative',
                owner_contact: '+233 25 123 4567',
                home_port: 'Akosombo',
                active: false,
                created: '2024-01-02T09:10:00',
                last_updated: '2024-01-02T09:10:00'
            },
            {
                name: 'Kpando Spirit',
                registration_number: 'GH-022-KS',
                vessel_type: 'Passenger',
                length_meters: 24.0,
                owner_name: 'Kpando Transport Ltd.',
                owner_contact: '+233 35 234 5678',
                home_port: 'Kpando',
                active: true,
                created: '2024-01-20T14:30:00',
                last_updated: '2024-01-20T14:30:00'
            },
            {
                name: 'Akatsi Voyager',
                registration_number: 'GH-023-AV',
                vessel_type: 'Passenger',
                length_meters: 29.0,
                owner_name: 'Akatsi Marine Co.',
                owner_contact: '+233 36 345 6789',
                home_port: 'Akatsi',
                active: true,
                created: '2024-02-07T11:45:00',
                last_updated: '2024-02-07T11:45:00'
            },
            {
                name: 'Dwarf Island Ferry',
                registration_number: 'GH-024-DIF',
                vessel_type: 'Fishing',
                length_meters: 13.0,
                owner_name: 'Dwarf Island Fishermen',
                owner_contact: '+233 39 456 7890',
                home_port: 'Dwarf Island',
                active: true,
                created: '2024-02-25T16:00:00',
                last_updated: '2024-02-25T16:00:00'
            },
            {
                name: 'Lake Volta Explorer',
                registration_number: 'GH-025-LVE',
                vessel_type: 'Other',
                length_meters: 33.0,
                owner_name: 'Lake Volta Research Institute',
                owner_contact: '+233 51 567 8901',
                home_port: 'Akosombo',
                active: true,
                created: '2024-03-15T09:15:00',
                last_updated: '2024-03-15T09:15:00'
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
        await queryRunner.query(`DELETE FROM vessel WHERE registration_number LIKE 'GH-%'`);
    }

}
