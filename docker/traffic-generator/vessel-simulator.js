// vessel-simulator.js
const mqtt = require('mqtt');
const fs = require('fs');

// Configuration
const config = {
  broker: 'mqtt://localhost:1883',
  username: 'artemis',
  password: 'artemis_password',
  vesselId: 1, // Change this to match a vessel ID in your database
  updateIntervalMs: 1000, // Send a position update every second
  movementSpeed: 0.0001, // Degrees of lat/long change per update
  startPosition: {
    latitude: 5.5500,  // Accra, Ghana approximate coordinates
    longitude: -0.2000
  }
};

// Connect to MQTT broker
const client = mqtt.connect(config.broker, {
  username: config.username,
  password: config.password,
  clientId: `vessel-simulator-${config.vesselId}-${Date.now()}`
});

// Current position and heading
let position = {
  latitude: config.startPosition.latitude,
  longitude: config.startPosition.longitude,
  heading: Math.random() * 360, // Random initial heading
  speed: 5 + (Math.random() * 5) // 5-10 knots
};

// Change heading occasionally to create a more realistic path
setInterval(() => {
  // Change heading by up to 30 degrees in either direction
  position.heading += (Math.random() * 60 - 30);
  
  // Keep heading between 0-360
  position.heading = position.heading % 360;
  if (position.heading < 0) position.heading += 360;
  
  // Randomly adjust speed sometimes
  if (Math.random() > 0.8) {
    position.speed = Math.max(0.5, Math.min(15, position.speed + (Math.random() * 2 - 1)));
  }
  
  console.log(`Changed heading to ${position.heading.toFixed(1)}° at ${position.speed.toFixed(1)} knots`);
}, 10000); // Change heading every 10 seconds

// Handle connection
client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Start sending position updates
  setInterval(sendPositionUpdate, config.updateIntervalMs);
});

function sendPositionUpdate() {
  // Calculate new position based on heading and speed
  const headingRad = position.heading * (Math.PI / 180);
  
  // Calculate movement based on speed and heading
  // This is a simplified calculation that doesn't account for Earth's curvature
  // but is good enough for testing purposes
  const movement = config.movementSpeed * (position.speed / 5);
  
  position.latitude += movement * Math.cos(headingRad);
  position.longitude += movement * Math.sin(headingRad);
  
  // Create message in the format expected by MqttTrackingService
  const message = {
    timestamp: new Date().toISOString(),
    position: {
      type: 'Point',
      coordinates: [position.longitude, position.latitude]
    },
    speed_knots: position.speed,
    heading_degrees: position.heading,
    status: position.speed > 0.5 ? 'moving' : 'stationary',
    device_id: `simulator-${config.vesselId}`
  };
  
  // Send to MQTT topic
  const topic = `vessels/${config.vesselId}/position`;
  client.publish(topic, JSON.stringify(message));
  
  console.log(`Sent position update: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`);
}

// Error handling
client.on('error', (error) => {
  console.error('MQTT Error:', error);
});

client.on('close', () => {
  console.log('Connection to MQTT broker closed');
});

process.on('SIGINT', () => {
  console.log('Shutting down simulator...');
  client.end();
  process.exit();
});
