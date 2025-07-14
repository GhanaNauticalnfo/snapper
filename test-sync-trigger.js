// Test script to verify sync WebSocket triggers map updates
const io = require('socket.io-client');

// Connect to the sync namespace
const socket = io('http://localhost:3000/sync', {
  path: '/socket.io/',
  transports: ['polling', 'websocket']
});

socket.on('connect', () => {
  console.log('Connected to sync namespace');
  console.log('Waiting for sync updates...');
  console.log('To test: Make changes in the admin interface (e.g., change vessel type color)');
});

socket.on('sync-update', (data) => {
  console.log('Received sync update:', data);
  console.log('The map should now reload vessel types and positions');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Keep the script running
process.stdin.resume();