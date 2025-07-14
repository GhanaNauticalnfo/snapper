import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: false,
  logging: false
});

async function findVesselWithDevice() {
  await AppDataSource.initialize();
  
  const result = await AppDataSource.query(`
    SELECT v.id as vessel_id, v.name as vessel_name, 
           d.device_id, d.auth_token, d.state
    FROM vessels v
    JOIN device_tokens d ON d.vessel_id = v.id
    WHERE d.state = 'active'
    LIMIT 5
  `);
  
  console.log('Active devices found:');
  console.log(JSON.stringify(result, null, 2));
  
  await AppDataSource.destroy();
}

findVesselWithDevice().catch(console.error);