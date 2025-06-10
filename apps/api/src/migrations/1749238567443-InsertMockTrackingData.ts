import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertMockTrackingData1749238567443 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fixed tracking points for first 5 vessels with hardcoded positions and timestamps
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
            { vessel_id: 5, position: [8.234567, 1.234567], timestamp: '2025-06-01T14:30:00.000Z', speed: 0, heading: 0 }
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
        // Delete all tracking points for first 5 mock vessels (vessel IDs 1-5)
        await queryRunner.query(`DELETE FROM tracking_point WHERE vessel_id BETWEEN 1 AND 5`);
    }

}
