const axios = require('axios');

async function testSync() {
  try {
    // Test with since=0 to get all data
    const response = await axios.get('http://localhost:3000/api/data/sync?since=0');
    
    console.log('=== SYNC RESPONSE ===');
    console.log('Version:', response.data.version);
    console.log('Total items:', response.data.data.length);
    console.log('');
    
    // Group by entity type and action
    const stats = {};
    response.data.data.forEach(item => {
      const key = `${item.entity_type}-${item.action}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    
    console.log('=== BREAKDOWN BY TYPE AND ACTION ===');
    Object.entries(stats).forEach(([key, count]) => {
      console.log(`${key}: ${count}`);
    });
    console.log('');
    
    // Show each item
    console.log('=== DETAILED ITEMS ===');
    response.data.data.forEach((item, index) => {
      console.log(`${index + 1}. ${item.entity_type}:${item.entity_id} - ${item.action}`);
      if (item.data && item.data.properties) {
        console.log(`   Name: ${item.data.properties.name}`);
      }
    });
    
    // Calculate what should be in the database after sync
    console.log('\n=== EXPECTED DATABASE STATE AFTER SYNC ===');
    const finalState = {};
    
    response.data.data.forEach(item => {
      const key = `${item.entity_type}:${item.entity_id}`;
      if (item.action === 'delete') {
        delete finalState[key];
      } else {
        finalState[key] = item.data?.properties?.name || 'unnamed';
      }
    });
    
    const byType = {};
    Object.entries(finalState).forEach(([key, name]) => {
      const [type] = key.split(':');
      if (!byType[type]) byType[type] = [];
      byType[type].push({ key, name });
    });
    
    Object.entries(byType).forEach(([type, items]) => {
      console.log(`\n${type}s: ${items.length} total`);
      items.forEach(item => {
        console.log(`  - ${item.key}: ${item.name}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSync();