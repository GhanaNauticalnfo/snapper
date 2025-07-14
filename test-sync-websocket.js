const { io } = require('socket.io-client');

// Connect to the sync namespace
const socket = io('http://localhost:3000/sync', {
  transports: ['websocket'],
});

console.log('Connecting to sync namespace...');

socket.on('connect', () => {
  console.log('✅ Connected to /sync namespace');
  console.log('Socket ID:', socket.id);
  console.log('Waiting for sync updates...');
});

socket.on('sync-update', (data) => {
  console.log('\n🔄 Received sync update:');
  console.log('  Major version:', data.major_version);
  console.log('  Minor version:', data.minor_version);
  console.log('  Timestamp:', data.timestamp);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from /sync namespace');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Keep the script running
console.log('\nPress Ctrl+C to exit\n');

// Test trigger after 2 seconds
setTimeout(() => {
  console.log('Now update a vessel via API to trigger a sync notification...');
  console.log('Example: curl -X PUT http://localhost:3000/api/vessels/2 -H "Content-Type: application/json" -d \'{"name":"Test Vessel Updated"}\'');
}, 2000);