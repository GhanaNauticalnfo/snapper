#!/usr/bin/env ts-node

/**
 * Script to generate large amounts of telemetry test data for export testing
 * Usage: npx ts-node scripts/generate-telemetry-test-data.ts [numberOfRecords]
 */

import { DataSource } from 'typeorm';
import { VesselTelemetry } from '../apps/api/src/app/vessels/tracking/vessel-telemetry.entity';
import { Vessel } from '../apps/api/src/app/vessels/vessel.entity';

async function generateTestData(recordCount: number = 100000) {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'ghanawaters_user',
    password: process.env.DATABASE_PASSWORD || 'ghanawaters_password',
    database: process.env.DATABASE_NAME || 'ghanawaters_db',
    entities: [VesselTelemetry, Vessel],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log(`Connected to database. Generating ${recordCount} telemetry records...`);

    // Get available vessels
    const vessels = await dataSource.getRepository(Vessel).find({ take: 10 });
    if (vessels.length === 0) {
      console.error('No vessels found in database. Please create some vessels first.');
      return;
    }

    console.log(`Found ${vessels.length} vessels to use for test data`);

    const batchSize = 1000;
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    const timeRange = endDate.getTime() - startDate.getTime();

    let processedCount = 0;
    const startTime = Date.now();

    while (processedCount < recordCount) {
      const batch: Partial<VesselTelemetry>[] = [];
      const remainingRecords = recordCount - processedCount;
      const currentBatchSize = Math.min(batchSize, remainingRecords);

      for (let i = 0; i < currentBatchSize; i++) {
        const vessel = vessels[Math.floor(Math.random() * vessels.length)];
        const timestamp = new Date(startDate.getTime() + Math.random() * timeRange);
        
        // Generate realistic position near Ghana coast
        const baseLat = -5.5 + (Math.random() * 2 - 1); // Around Ghana latitude
        const baseLon = -0.2 + (Math.random() * 2 - 1); // Around Ghana longitude

        batch.push({
          vessel_id: vessel.id,
          timestamp,
          position: () => `ST_SetSRID(ST_MakePoint(${baseLon}, ${baseLat}), 4326)`,
          speed_knots: Math.random() * 20,
          heading_degrees: Math.floor(Math.random() * 360),
          device_id: `device_${vessel.id}`,
          status: Math.random() > 0.9 ? 'inactive' : 'active',
        } as any);
      }

      // Insert batch using raw SQL for better performance
      const values = batch.map((record, index) => {
        const offset = processedCount + index;
        return `(
          ${record.vessel_id},
          '${record.timestamp!.toISOString()}',
          ST_SetSRID(ST_MakePoint(${-0.2 + (Math.random() * 2 - 1)}, ${-5.5 + (Math.random() * 2 - 1)}), 4326),
          ${record.speed_knots},
          ${record.heading_degrees},
          '${record.device_id}',
          '${record.status}'
        )`;
      }).join(',\n');

      const insertQuery = `
        INSERT INTO vessel_telemetry (
          vessel_id, timestamp, position, speed_knots, heading_degrees,
          device_id, status
        ) VALUES ${values}
      `;

      await dataSource.query(insertQuery);

      processedCount += currentBatchSize;
      
      // Log progress
      if (processedCount % 10000 === 0 || processedCount === recordCount) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = Math.round(processedCount / elapsed);
        console.log(`Inserted ${processedCount}/${recordCount} records (${rate} records/sec)`);
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\nCompleted! Generated ${recordCount} telemetry records in ${totalTime.toFixed(2)} seconds`);
    console.log(`Average rate: ${Math.round(recordCount / totalTime)} records/second`);

  } catch (error) {
    console.error('Error generating test data:', error);
  } finally {
    await dataSource.destroy();
  }
}

// Run the script
const recordCount = process.argv[2] ? parseInt(process.argv[2]) : 100000;
generateTestData(recordCount).catch(console.error);