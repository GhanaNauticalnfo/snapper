import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertMockTrackingData1749238567443 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fixed tracking points for all vessels with hardcoded positions and timestamps
        // Based on the original mock data but with consistent, non-random values
        const trackingData = [
            // Vessel 1: Akosombo Explorer
            { vessel_id: 1, position: [6.301885, 0.051682], timestamp: '2025-06-04T08:30:00.000Z', speed: 12.5, heading: 85 },
            
            // Vessel 2: Black Volta
            { vessel_id: 2, position: [6.682791, 0.184252], timestamp: '2025-06-04T09:15:00.000Z', speed: 8.2, heading: 120 },
            
            // Vessel 3: Adomi Bridge Cruiser
            { vessel_id: 3, position: [6.103081, 0.072913], timestamp: '2025-06-04T10:45:00.000Z', speed: 5.1, heading: 200 },
            
            // Vessel 4: Accra Star
            { vessel_id: 4, position: [7.123456, 0.876543], timestamp: '2025-06-04T11:20:00.000Z', speed: 15.3, heading: 45 },
            
            // Vessel 5: Kumasi Queen (inactive, older timestamp)
            { vessel_id: 5, position: [8.234567, 1.234567], timestamp: '2025-06-01T14:30:00.000Z', speed: 0, heading: 0 },
            
            // Vessel 6: Cape Coast Navigator
            { vessel_id: 6, position: [7.456789, 0.654321], timestamp: '2025-06-04T12:55:00.000Z', speed: 6.8, heading: 315 },
            
            // Vessel 7: Volta Lake Transporter
            { vessel_id: 7, position: [7.135765, 0.164211], timestamp: '2025-06-04T13:10:00.000Z', speed: 10.2, heading: 180 },
            
            // Vessel 8: Ghana Pride
            { vessel_id: 8, position: [8.345678, 1.123456], timestamp: '2025-06-04T14:25:00.000Z', speed: 18.7, heading: 90 },
            
            // Vessel 9: Tamale Fisher (inactive)
            { vessel_id: 9, position: [8.029323, 0.268581], timestamp: '2025-06-02T15:50:00.000Z', speed: 0, heading: 0 },
            
            // Vessel 10: Kwame Nkrumah
            { vessel_id: 10, position: [6.876543, 0.987654], timestamp: '2025-06-04T16:15:00.000Z', speed: 22.1, heading: 270 },
            
            // Vessel 11: Elmina Trader
            { vessel_id: 11, position: [7.785811, 0.492505], timestamp: '2025-06-04T17:30:00.000Z', speed: 14.5, heading: 135 },
            
            // Vessel 12: Keta Adventurer
            { vessel_id: 12, position: [7.654321, 1.345678], timestamp: '2025-06-04T18:45:00.000Z', speed: 4.2, heading: 250 },
            
            // Vessel 13: Takoradi Express (inactive)
            { vessel_id: 13, position: [6.940847, 0.415515], timestamp: '2025-05-30T14:00:00.000Z', speed: 0, heading: 0 },
            
            // Vessel 14: Volta Dam Surveyor
            { vessel_id: 14, position: [6.789012, 0.456789], timestamp: '2025-06-04T19:20:00.000Z', speed: 7.8, heading: 30 },
            
            // Vessel 15: Ashanti Explorer
            { vessel_id: 15, position: [8.371338, 0.835194], timestamp: '2025-06-04T20:35:00.000Z', speed: 5.9, heading: 165 },
            
            // Vessel 16: Ho Voyager
            { vessel_id: 16, position: [8.123456, 1.456789], timestamp: '2025-06-04T21:50:00.000Z', speed: 16.4, heading: 225 },
            
            // Vessel 17: Yeji Ferry (inactive)
            { vessel_id: 17, position: [8.266669, 0.766670], timestamp: '2025-06-01T08:05:00.000Z', speed: 0, heading: 0 },
            
            // Vessel 18: Afram Plains Fisher
            { vessel_id: 18, position: [7.987654, 0.321098], timestamp: '2025-06-04T22:25:00.000Z', speed: 3.7, heading: 75 },
            
            // Vessel 19: Tema Harvester
            { vessel_id: 19, position: [7.302711, 0.177216], timestamp: '2025-06-04T23:40:00.000Z', speed: 9.3, heading: 300 },
            
            // Vessel 20: Dodi Island Transporter
            { vessel_id: 20, position: [8.456789, 1.098765], timestamp: '2025-06-05T00:55:00.000Z', speed: 11.8, heading: 150 },
            
            // Vessel 21: Akosombo Fisher (inactive)
            { vessel_id: 21, position: [6.572645, 0.163892], timestamp: '2025-06-03T09:10:00.000Z', speed: 0, heading: 0 },
            
            // Vessel 22: Kpando Spirit
            { vessel_id: 22, position: [7.765432, 0.567890], timestamp: '2025-06-05T01:30:00.000Z', speed: 13.6, heading: 60 },
            
            // Vessel 23: Akatsi Voyager
            { vessel_id: 23, position: [7.286461, 0.076230], timestamp: '2025-06-05T02:45:00.000Z', speed: 17.2, heading: 330 },
            
            // Vessel 24: Dwarf Island Ferry
            { vessel_id: 24, position: [8.654321, 1.234098], timestamp: '2025-06-05T03:00:00.000Z', speed: 6.1, heading: 210 },
            
            // Vessel 25: Lake Volta Explorer
            { vessel_id: 25, position: [7.043740, 0.268209], timestamp: '2025-06-05T04:15:00.000Z', speed: 8.9, heading: 105 }
        ];

        // Insert tracking points
        for (const track of trackingData) {
            await queryRunner.query(`
                INSERT INTO tracking_point (vessel_id, position, timestamp, speed_knots, heading_degrees)
                VALUES ($1, ST_GeogFromText('POINT(' || $2 || ' ' || $3 || ')'), $4, $5, $6)
            `, [
                track.vessel_id,
                track.position[1], // longitude
                track.position[0], // latitude  
                track.timestamp,
                track.speed,
                track.heading
            ]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Delete all tracking points for mock vessels (vessel IDs 1-25)
        await queryRunner.query(`DELETE FROM tracking_point WHERE vessel_id BETWEEN 1 AND 25`);
    }

}
