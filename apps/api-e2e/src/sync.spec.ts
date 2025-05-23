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

      // Create a marker
      const markerData = {
        name: 'E2E Test Marker',
        lat: 5.5,
        lng: -0.2,
        icon: 'test',
        enabled: true
      };

      const createResponse = await api.post('/api/markers', markerData);
      const markerId = createResponse.data.id;

      await waitForTimestamp();

      // Update the marker
      await api.put(`/api/markers/${markerId}`, {
        name: 'E2E Updated Marker'
      });

      await waitForTimestamp();

      // Get changes since before creation
      const syncResponse = await api.get('/api/data/sync', {
        params: { since: beforeChanges }
      });

      const markerChanges = syncResponse.data.data.filter(
        (change: any) => change.entity_id === markerId.toString()
      );

      // Should only have the latest change (update)
      expect(markerChanges).toHaveLength(1);
      expect(markerChanges[0].action).toBe('update');
      expect(markerChanges[0].data.properties.name).toBe('E2E Updated Marker');

      // Cleanup
      await api.delete(`/api/markers/${markerId}`);
    });

    it('should track deletions', async () => {
      // Create a hazard
      const hazardData = {
        name: 'E2E Test Hazard',
        lat: 5.5,
        lng: -0.2,
        radius: 100,
        type: 'test',
        enabled: true
      };

      const createResponse = await api.post('/api/hazards', hazardData);
      const hazardId = createResponse.data.id;

      await waitForTimestamp();
      const beforeDelete = new Date().toISOString();

      // Delete the hazard
      await api.delete(`/api/hazards/${hazardId}`);

      await waitForTimestamp();

      // Get changes since before deletion
      const syncResponse = await api.get('/api/data/sync', {
        params: { since: beforeDelete }
      });

      const deleteChange = syncResponse.data.data.find(
        (change: any) => change.entity_id === hazardId.toString() && change.action === 'delete'
      );

      expect(deleteChange).toBeDefined();
      expect(deleteChange.entity_type).toBe('hazard');
      expect(deleteChange.data).toBeNull();
    });

    it('should handle multiple entity types', async () => {
      const beforeChanges = new Date().toISOString();
      await waitForTimestamp();

      // Create different entities
      const route = await api.post('/api/routes', {
        name: 'Multi Test Route',
        waypoints: [{ lat: 5.5, lng: -0.2, order: 1 }],
        enabled: true
      });

      const marker = await api.post('/api/markers', {
        name: 'Multi Test Marker',
        lat: 5.5,
        lng: -0.2,
        enabled: true
      });

      const hazard = await api.post('/api/hazards', {
        name: 'Multi Test Hazard',
        lat: 5.5,
        lng: -0.2,
        type: 'test',
        enabled: true
      });

      await waitForTimestamp();

      // Get all changes
      const syncResponse = await api.get('/api/data/sync', {
        params: { since: beforeChanges }
      });

      const entityTypes = new Set(
        syncResponse.data.data.map((change: any) => change.entity_type)
      );

      expect(entityTypes.has('route')).toBe(true);
      expect(entityTypes.has('marker')).toBe(true);
      expect(entityTypes.has('hazard')).toBe(true);

      // Cleanup
      await api.delete(`/api/routes/${route.data.id}`);
      await api.delete(`/api/markers/${marker.data.id}`);
      await api.delete(`/api/hazards/${hazard.data.id}`);
    });
  });
});