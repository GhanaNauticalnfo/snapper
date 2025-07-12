const mqtt = require('mqtt');

// Connect to MQTT broker as a device (to test ACL rules)
const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'api',
  password: 'mqtt_api_password',
  clientId: `test-sync-subscriber-${Date.now()}`
});

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Subscribe to sync topic
  client.subscribe('/sync', (err) => {
    if (err) {
      console.error('Subscribe error:', err);
    } else {
      console.log('Subscribed to /sync topic');
    }
  });
});

client.on('message', (topic, payload) => {
  console.log(`Received message on ${topic}:`, payload.toString());
  try {
    const message = JSON.parse(payload.toString());
    console.log('Parsed sync notification:', message);
  } catch (e) {
    console.error('Failed to parse message:', e);
  }
});

client.on('error', (error) => {
  console.error('MQTT Error:', error);
});

console.log('MQTT sync subscriber started. Press Ctrl+C to exit.');