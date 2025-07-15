const io = require('socket.io-client');

// Connect to the tracking namespace
const socket = io('http://localhost:3000/tracking', {
  path: '/socket.io/',
  transports: ['polling', 'websocket']
});

socket.on('connect', () => {
  console.log('Connected to tracking websocket');
  socket.emit('subscribe-all');
});

socket.on('subscribed', (data) => {
  console.log('Subscription confirmed:', data);
});

socket.on('position-update', (update) => {
  console.log('\nReceived position update:');
  console.log('  Vessel ID:', update.vesselId);
  console.log('  Vessel Name:', update.vesselName);
  console.log('  Vessel Type:', update.vesselType);
  console.log('  Vessel Type ID:', update.vesselTypeId); // This should now be included
  console.log('  Position:', update.lat, update.lng);
  console.log('  Heading:', update.heading);
  console.log('  Speed:', update.speed);
});

socket.on('disconnect', () => {
  console.log('Disconnected from tracking websocket');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

console.log('Waiting for position updates...');