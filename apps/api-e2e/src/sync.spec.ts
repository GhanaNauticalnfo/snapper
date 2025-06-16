import axios from 'axios';

describe('Sync API E2E', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3000';
  const api = axios.create({ baseURL });

  // Helper function to wait for a timestamp
  const waitForTimestamp = () => new Promise(resolve => setTimeout(resolve, 10));

  describe('GET /api/data/sync', () => {
    it('should return empty data when no changes exist', async () => {
      const response = await api.get('/api/data/sync', {
        params: { since: new Date().toISOString() }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toEqual([]);
    });

    it('should return all changes when since=0', async () => {
      const response = await api.get('/api/data/sync', {
        params: { since: '0' }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should track route creation', async () => {
      // Create a route
      const routeData = {
        name: 'E2E Test Route',
        description: 'Created by E2E test',
        waypoints: [
          { lat: 5.5, lng: -0.2, order: 1 },
          { lat: 5.6, lng: -0.1, order: 2 }
        ],
        color: '#0000FF',
        enabled: true
      };

      const createResponse = await api.post('/api/routes', routeData);
      const routeId = createResponse.data.id;

      await waitForTimestamp();

      // Check sync log
      const syncResponse = await api.get('/api/data/sync', {
        params: { since: '0' }
      });

      const routeChange = syncResponse.data.data.find(
        (change: any) => change.entity_id === routeId.toString() && change.entity_type === 'route'
      );

      expect(routeChange).toBeDefined();
      expect(routeChange.action).toBe('create');
      expect(routeChange.data.type).toBe('Feature');
      expect(routeChange.data.geometry.type).toBe('LineString');
      expect(routeChange.data.properties.name).toBe('E2E Test Route');

      // Cleanup
      await api.delete(`/api/routes/${routeId}`);
    });

    it('should track incremental changes', async () => {
      // Get current timestamp
      const beforeChanges = new Date().toISOString();
      await waitForTimestamp();

      // Create a route
      const routeData = {
        name: 'E2E Test Route',
        description: 'Test route for E2E testing',
        waypoints: [
          { order: 0, lat: 5.5, lng: -0.2, name: 'Start' },
          { order: 1, lat: 5.6, lng: -0.3, name: 'End' }
        ],
        enabled: true
      };

      const createResponse = await api.post('/api/routes', routeData);
      const routeId = createResponse.data.id;

      await waitForTimestamp();

      // Update the route
      await api.put(`/api/routes/${routeId}`, {
        name: 'E2E Updated Route'
      });

      await waitForTimestamp();

      // Get changes since before creation
      const syncResponse = await api.get('/api/data/sync', {
        params: { since: beforeChanges }
      });

      const routeChanges = syncResponse.data.data.filter(
        (change: any) => change.entity_id === routeId.toString()
      );

      // Should only have the latest change (update)
      expect(routeChanges).toHaveLength(1);
      expect(routeChanges[0].action).toBe('update');
      expect(routeChanges[0].data.properties.name).toBe('E2E Updated Route');

      // Cleanup
      await api.delete(`/api/routes/${routeId}`);
    });

    it('should track deletions', async () => {
      // Create a route
      const routeData = {
        name: 'E2E Test Route for Deletion',
        description: 'This route will be deleted',
        waypoints: [
          { order: 0, lat: 5.5, lng: -0.2, name: 'Start' },
          { order: 1, lat: 5.6, lng: -0.3, name: 'End' }
        ],
        enabled: true
      };

      const createResponse = await api.post('/api/routes', routeData);
      const routeId = createResponse.data.id;

      await waitForTimestamp();
      const beforeDelete = new Date().toISOString();

      // Delete the route
      await api.delete(`/api/routes/${routeId}`);

      await waitForTimestamp();

      // Get changes since before deletion
      const syncResponse = await api.get('/api/data/sync', {
        params: { since: beforeDelete }
      });

      const deleteChange = syncResponse.data.data.find(
        (change: any) => change.entity_id === routeId.toString() && change.action === 'delete'
      );

      expect(deleteChange).toBeDefined();
      expect(deleteChange.entity_type).toBe('route');
      expect(deleteChange.data).toBeNull();
    });

    it('should handle multiple changes', async () => {
      const beforeChanges = new Date().toISOString();
      await waitForTimestamp();

      // Create multiple routes
      const route1 = await api.post('/api/routes', {
        name: 'Multi Test Route 1',
        waypoints: [
          { lat: 5.5, lng: -0.2, order: 0, name: 'Start' },
          { lat: 5.6, lng: -0.3, order: 1, name: 'End' }
        ],
        enabled: true
      });

      const route2 = await api.post('/api/routes', {
        name: 'Multi Test Route 2',
        waypoints: [
          { lat: 5.7, lng: -0.4, order: 0, name: 'Start' },
          { lat: 5.8, lng: -0.5, order: 1, name: 'End' }
        ],
        enabled: true
      });

      await waitForTimestamp();

      // Get all changes
      const syncResponse = await api.get('/api/data/sync', {
        params: { since: beforeChanges }
      });

      const routeChanges = syncResponse.data.data.filter(
        (change: any) => change.entity_type === 'route'
      );

      expect(routeChanges.length).toBeGreaterThanOrEqual(2);
      
      const routeIds = new Set(routeChanges.map((change: any) => change.entity_id));
      expect(routeIds.has(route1.data.id.toString())).toBe(true);
      expect(routeIds.has(route2.data.id.toString())).toBe(true);

      // Cleanup
      await api.delete(`/api/routes/${route1.data.id}`);
      await api.delete(`/api/routes/${route2.data.id}`);
    });
  });
});