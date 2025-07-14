import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DataSource } from 'typeorm';
import { io, Socket } from 'socket.io-client';

describe('Telemetry Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let deviceToken: string;
  let wsClient: Socket;
  let vesselId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    dataSource = app.get(DataSource);
    
    // Create a test vessel
    const vesselResult = await dataSource.query(`
      INSERT INTO vessels (name, vessel_type_id)
      VALUES ('Test Integration Vessel', 1)
      RETURNING id
    `);
    vesselId = vesselResult[0].id;
    
    // Create a device token for the vessel
    const tokenResult = await dataSource.query(`
      INSERT INTO device_tokens (vessel_id, activation_token, expires_at, device_name)
      VALUES ($1, 'test-activation-token', NOW() + INTERVAL '1 day', 'Test Device')
      RETURNING activation_token
    `, [vesselId]);
    
    // Activate the device to get bearer token
    const activationResponse = await request(app.getHttpServer())
      .post('/api/devices/activate')
      .send({ activationToken: tokenResult[0].activation_token })
      .expect(201);
    
    deviceToken = activationResponse.body.token;
  });

  afterAll(async () => {
    if (wsClient) {
      wsClient.disconnect();
    }
    
    // Clean up test data
    await dataSource.query('DELETE FROM vessel_telemetry WHERE vessel_id = $1', [vesselId]);
    await dataSource.query('DELETE FROM device_tokens WHERE vessel_id = $1', [vesselId]);
    await dataSource.query('DELETE FROM vessels WHERE id = $1', [vesselId]);
    
    await app.close();
  });

  describe('Position Reporting Flow', () => {
    it('should report position via HTTPS and broadcast via WebSocket', async () => {
      // Setup WebSocket client
      const wsUrl = `ws://localhost:${process.env.PORT || 3000}`;
      wsClient = io(wsUrl, {
        transports: ['websocket'],
      });
      
      const positionReceived = new Promise((resolve) => {
        wsClient.on('connect', () => {
          // Subscribe to all vessel positions
          wsClient.emit('subscribe-all');
        });
        
        wsClient.on('position-update', (data) => {
          if (data.vessel_id === vesselId) {
            resolve(data);
          }
        });
      });
      
      // Report position via HTTPS
      const positionData = {
        timestamp: new Date().toISOString(),
        position: {
          type: 'Point',
          coordinates: [-0.1225, 5.6037]
        },
        speed_knots: 10.5,
        heading_degrees: 180,
        status: 'moving'
      };
      
      const response = await request(app.getHttpServer())
        .post('/api/vessels/telemetry/report')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send(positionData)
        .expect(201);
      
      // Verify HTTPS response
      expect(response.body).toMatchObject({
        vessel_id: vesselId,
        position: positionData.position,
        speed_knots: positionData.speed_knots,
        heading_degrees: positionData.heading_degrees,
        status: positionData.status
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.created).toBeDefined();
      
      // Verify WebSocket broadcast
      const wsData = await positionReceived;
      expect(wsData).toMatchObject({
        vessel_id: vesselId,
        position: positionData.position,
        speed_knots: positionData.speed_knots,
        heading_degrees: positionData.heading_degrees,
        vessel: {
          id: vesselId,
          name: 'Test Integration Vessel'
        }
      });
      
      // Verify position was stored in database
      const storedPosition = await dataSource.query(
        'SELECT * FROM vessel_telemetry WHERE vessel_id = $1 ORDER BY created DESC LIMIT 1',
        [vesselId]
      );
      
      expect(storedPosition).toHaveLength(1);
      expect(storedPosition[0].vessel_id).toBe(vesselId);
      expect(storedPosition[0].speed_knots).toBe(10.5);
      expect(storedPosition[0].heading_degrees).toBe(180);
      
      // Verify latest position was updated on vessel
      const vessel = await dataSource.query(
        'SELECT latest_position_id FROM vessels WHERE id = $1',
        [vesselId]
      );
      expect(vessel[0].latest_position_id).toBe(storedPosition[0].id);
    });

    it('should retrieve latest positions for all vessels', async () => {
      // Report a position first
      await request(app.getHttpServer())
        .post('/api/vessels/telemetry/report')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({
          position: {
            type: 'Point',
            coordinates: [-0.1230, 5.6040]
          },
          speed_knots: 12.0,
          heading_degrees: 90
        })
        .expect(201);
      
      // Get latest positions
      const response = await request(app.getHttpServer())
        .get('/api/vessels/telemetry/latest')
        .expect(200);
      
      // Find our test vessel in the results
      const testVesselPosition = response.body.find((pos: any) => pos.vessel_id === vesselId);
      
      expect(testVesselPosition).toBeDefined();
      expect(testVesselPosition.position).toEqual({
        type: 'Point',
        coordinates: [-0.1230, 5.6040]
      });
      expect(testVesselPosition.speed_knots).toBe(12.0);
      expect(testVesselPosition.vessel).toMatchObject({
        id: vesselId,
        name: 'Test Integration Vessel'
      });
    });

    it('should handle invalid bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/vessels/telemetry/report')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          position: {
            type: 'Point',
            coordinates: [-0.1225, 5.6037]
          },
          speed_knots: 10.5,
          heading_degrees: 180
        })
        .expect(401);
    });

    it('should validate position data format', async () => {
      // Missing required fields
      await request(app.getHttpServer())
        .post('/api/vessels/telemetry/report')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({
          speed_knots: 10.5
          // position is required
        })
        .expect(400);
      
      // Invalid position format
      await request(app.getHttpServer())
        .post('/api/vessels/telemetry/report')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({
          position: {
            type: 'Point',
            coordinates: [-0.1225] // Should have 2 coordinates
          },
          speed_knots: 10.5
        })
        .expect(400);
    });

    it('should handle multiple concurrent position reports', async () => {
      const positions = [
        { lat: 5.6037, lon: -0.1225, speed: 10.5, heading: 90 },
        { lat: 5.6038, lon: -0.1226, speed: 11.0, heading: 92 },
        { lat: 5.6039, lon: -0.1227, speed: 11.5, heading: 94 },
      ];
      
      // Send multiple positions concurrently
      const requests = positions.map(pos => 
        request(app.getHttpServer())
          .post('/api/vessels/telemetry/report')
          .set('Authorization', `Bearer ${deviceToken}`)
          .send({
            position: {
              type: 'Point',
              coordinates: [pos.lon, pos.lat]
            },
            speed_knots: pos.speed,
            heading_degrees: pos.heading
          })
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(res => {
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
      });
      
      // Verify all positions were stored
      const storedPositions = await dataSource.query(
        'SELECT COUNT(*) as count FROM vessel_telemetry WHERE vessel_id = $1',
        [vesselId]
      );
      
      expect(parseInt(storedPositions[0].count)).toBeGreaterThanOrEqual(positions.length);
    });
  });

  describe('WebSocket Real-time Updates', () => {
    it('should allow subscribing to specific vessel updates', async () => {
      const wsUrl = `ws://localhost:${process.env.PORT || 3000}`;
      const specificClient = io(wsUrl, {
        transports: ['websocket'],
      });
      
      const positionReceived = new Promise((resolve) => {
        specificClient.on('connect', () => {
          // Subscribe to specific vessel
          specificClient.emit('subscribe-vessel', vesselId);
        });
        
        specificClient.on('position-update', (data) => {
          resolve(data);
        });
      });
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Report position
      await request(app.getHttpServer())
        .post('/api/vessels/telemetry/report')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({
          position: {
            type: 'Point',
            coordinates: [-0.1240, 5.6050]
          },
          speed_knots: 15.0,
          heading_degrees: 270
        })
        .expect(201);
      
      // Verify WebSocket received the update
      const wsData = await positionReceived;
      expect(wsData.vessel_id).toBe(vesselId);
      expect(wsData.speed_knots).toBe(15.0);
      
      specificClient.disconnect();
    });
    
    it('should handle unsubscribe from vessel updates', async () => {
      const wsUrl = `ws://localhost:${process.env.PORT || 3000}`;
      const unsubClient = io(wsUrl, {
        transports: ['websocket'],
      });
      
      let receivedCount = 0;
      
      unsubClient.on('connect', () => {
        // Subscribe first
        unsubClient.emit('subscribe-vessel', vesselId);
        
        // Unsubscribe after a delay
        setTimeout(() => {
          unsubClient.emit('unsubscribe-vessel', vesselId);
        }, 200);
      });
      
      unsubClient.on('position-update', () => {
        receivedCount++;
      });
      
      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send first position (should be received)
      await request(app.getHttpServer())
        .post('/api/vessels/telemetry/report')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({
          position: { type: 'Point', coordinates: [-0.1250, 5.6060] },
          speed_knots: 8.0
        });
      
      // Wait for unsubscribe
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Send second position (should NOT be received)
      await request(app.getHttpServer())
        .post('/api/vessels/telemetry/report')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({
          position: { type: 'Point', coordinates: [-0.1251, 5.6061] },
          speed_knots: 8.5
        });
      
      // Give time for any messages
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have received only the first position
      expect(receivedCount).toBe(1);
      
      unsubClient.disconnect();
    });
  });
});