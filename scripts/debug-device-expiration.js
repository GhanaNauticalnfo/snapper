#!/usr/bin/env node

const { Client } = require('pg');

async function debugDeviceExpiration(deviceId) {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'ghanawaters_db',
    user: 'ghanawaters_user',
    password: 'ghanawaters_password'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Query device data
    const query = `
      SELECT 
        device_id,
        device_token,
        activation_token,
        state,
        expires_at,
        expires_at AT TIME ZONE 'UTC' as expires_at_utc,
        created_at,
        created_at AT TIME ZONE 'UTC' as created_at_utc,
        activated_at,
        vessel_id,
        NOW() as current_db_time,
        NOW() AT TIME ZONE 'UTC' as current_db_time_utc,
        (expires_at < NOW()) as is_expired
      FROM devices
      WHERE device_id = $1
    `;

    const result = await client.query(query, [deviceId]);
    
    if (result.rows.length === 0) {
      console.log(`No device found with ID: ${deviceId}`);
      return;
    }

    const device = result.rows[0];
    console.log('\n=== DEVICE DEBUG INFO ===');
    console.log('Device ID:', device.device_id);
    console.log('State:', device.state);
    console.log('Vessel ID:', device.vessel_id);
    console.log('\n--- Timestamps ---');
    console.log('Created at:', device.created_at);
    console.log('Created at (UTC):', device.created_at_utc);
    console.log('Expires at:', device.expires_at);
    console.log('Expires at (UTC):', device.expires_at_utc);
    console.log('Activated at:', device.activated_at);
    console.log('\n--- Current Time ---');
    console.log('Database time:', device.current_db_time);
    console.log('Database time (UTC):', device.current_db_time_utc);
    console.log('\n--- Expiration Check ---');
    console.log('Is expired (DB check):', device.is_expired);
    
    if (device.expires_at) {
      const expiresMs = new Date(device.expires_at).getTime();
      const nowMs = new Date(device.current_db_time).getTime();
      const diffMs = expiresMs - nowMs;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      console.log('Time until expiration:', diffDays.toFixed(2), 'days');
      console.log('Time difference (ms):', diffMs);
    }

    console.log('\n--- Tokens ---');
    console.log('Device token:', device.device_token);
    console.log('Activation token:', device.activation_token);
    console.log('========================\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

// Get device ID from command line argument
const deviceId = process.argv[2];
if (!deviceId) {
  console.log('Usage: node debug-device-expiration.js <device-id>');
  console.log('Example: node debug-device-expiration.js 1b194486-1ce1-418b-af84-55e42481930e');
  process.exit(1);
}

debugDeviceExpiration(deviceId);