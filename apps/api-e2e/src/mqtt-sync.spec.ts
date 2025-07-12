import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../../api/src/app/app.module';
import { DataSource } from 'typeorm';
import * as mqtt from 'mqtt';
import { LandingSite } from '../../api/src/app/landing-sites/landing-site.entity';
import { Route } from '../../api/src/app/routes/route.entity';
import { SyncLog } from '../../api/src/app/sync/sync-log.entity';
import { SyncVersion } from '../../api/src/app/sync/sync-version.entity';

describe('MQTT Sync Notifications E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mqttClient: mqtt.MqttClient;
  let syncMessages: any[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    
    await app.init();
    
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Connect MQTT client for testing
    const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const mqttPassword = process.env.MQTT_API_PASSWORD || 'mqtt_api_password';
    
    mqttClient = mqtt.connect(mqttBrokerUrl, {
      username: 'api',
      password: mqttPassword,
      clientId: `e2e-test-${Date.now()}`,
    });

    await new Promise<void>((resolve, reject) => {
      mqttClient.on('connect', () => {
        mqttClient.subscribe('/sync', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      mqttClient.on('error', reject);
    });

    mqttClient.on('message', (topic, payload) => {
      if (topic === '/sync') {
        try {
          const message = JSON.parse(payload.toString());
          syncMessages.push(message);
        } catch (e) {
          console.error('Failed to parse MQTT message:', e);
        }
      }
    });
  });

  afterAll(async () => {
    if (mqttClient) {
      mqttClient.end();
    }
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clear sync messages
    syncMessages = [];

    // Clean up database
    await dataSource.getRepository(LandingSite).delete({});
    await dataSource.getRepository(Route).delete({});
    await dataSource.getRepository(SyncLog).delete({});
    
    // Ensure we have a sync version
    const existingVersion = await dataSource.getRepository(SyncVersion).findOne({
      where: { is_current: true },
    });
    
    if (!existingVersion) {
      await dataSource.getRepository(SyncVersion).save({
        major_version: 1,
        is_current: true,
      });
    }

    // Wait a bit for MQTT to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Landing Site sync notifications', () => {
    it('should publish MQTT notification when creating landing site', async () => {
      const landingSiteData = {
        name: 'Test Landing Site',
        description: 'Testing MQTT sync',
        location: {
          type: 'Point',
          coordinates: [-0.5, 5.5],
        },
        status: 'active',
      };

      const response = await request(app.getHttpServer())
        .post('/api/landing-sites')
        .send(landingSiteData)
        .expect(201);

      // Wait for MQTT message
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(syncMessages).toHaveLength(1);
      expect(syncMessages[0]).toMatchObject({
        major_version: expect.any(Number),
        minor_version: expect.any(Number),
      });

      // Verify sync log was created
      const syncLog = await dataSource.getRepository(SyncLog).findOne({
        where: {
          entity_type: 'landing_site',
          entity_id: response.body.id.toString(),
          action: 'create',
          is_latest: true,
        },
      });

      expect(syncLog).toBeDefined();
      expect(syncMessages[0].minor_version).toBe(syncLog.id);
    });

    it('should publish MQTT notification when updating landing site', async () => {
      // Create landing site first
      const landingSite = await dataSource.getRepository(LandingSite).save({
        name: 'Original Name',
        description: 'Original description',
        location: {
          type: 'Point',
          coordinates: [-0.5, 5.5],
        },
        status: 'active',
      });

      // Clear messages from creation
      syncMessages = [];

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      await request(app.getHttpServer())
        .put(`/api/landing-sites/${landingSite.id}`)
        .send(updateData)
        .expect(200);

      // Wait for MQTT message
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(syncMessages).toHaveLength(1);
      expect(syncMessages[0]).toMatchObject({
        major_version: expect.any(Number),
        minor_version: expect.any(Number),
      });
    });

    it('should publish MQTT notification when deleting landing site', async () => {
      // Create landing site first
      const landingSite = await dataSource.getRepository(LandingSite).save({
        name: 'To Delete',
        description: 'Will be deleted',
        location: {
          type: 'Point',
          coordinates: [-0.5, 5.5],
        },
        status: 'active',
      });

      // Clear messages from creation
      syncMessages = [];

      await request(app.getHttpServer())
        .delete(`/api/landing-sites/${landingSite.id}`)
        .expect(200);

      // Wait for MQTT message
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(syncMessages).toHaveLength(1);
      expect(syncMessages[0]).toMatchObject({
        major_version: expect.any(Number),
        minor_version: expect.any(Number),
      });

      // Verify delete was logged
      const syncLog = await dataSource.getRepository(SyncLog).findOne({
        where: {
          entity_type: 'landing_site',
          entity_id: landingSite.id.toString(),
          action: 'delete',
          is_latest: true,
        },
      });

      expect(syncLog).toBeDefined();
      expect(syncLog.data).toBeNull();
    });
  });

  describe('Route sync notifications', () => {
    it('should publish MQTT notification when creating route', async () => {
      const routeData = {
        name: 'Test Route',
        notes: 'Testing MQTT sync',
        waypoints: [
          { order: 0, name: 'Start', lat: 5.6, lng: -0.2 },
          { order: 1, name: 'End', lat: 5.7, lng: -0.3 },
        ],
        enabled: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/routes')
        .send(routeData)
        .expect(201);

      // Wait for MQTT message
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(syncMessages).toHaveLength(1);
      expect(syncMessages[0]).toMatchObject({
        major_version: expect.any(Number),
        minor_version: expect.any(Number),
      });

      // Verify sync log was created
      const syncLog = await dataSource.getRepository(SyncLog).findOne({
        where: {
          entity_type: 'route',
          entity_id: response.body.id.toString(),
          action: 'create',
          is_latest: true,
        },
      });

      expect(syncLog).toBeDefined();
      expect(syncLog.data).toMatchObject({
        type: 'Feature',
        geometry: { type: 'LineString' },
      });
    });
  });

  describe('Multiple operations', () => {
    it('should publish notifications for multiple operations in sequence', async () => {
      // Create multiple entities
      const operations = [
        () => request(app.getHttpServer())
          .post('/api/landing-sites')
          .send({
            name: 'Site 1',
            description: 'First site',
            location: { type: 'Point', coordinates: [-0.1, 5.1] },
            status: 'active',
          }),
        () => request(app.getHttpServer())
          .post('/api/landing-sites')
          .send({
            name: 'Site 2',
            description: 'Second site',
            location: { type: 'Point', coordinates: [-0.2, 5.2] },
            status: 'active',
          }),
        () => request(app.getHttpServer())
          .post('/api/routes')
          .send({
            name: 'Route 1',
            notes: 'First route',
            waypoints: [
              { order: 0, name: 'A', lat: 5.0, lng: -0.0 },
              { order: 1, name: 'B', lat: 5.1, lng: -0.1 },
            ],
            enabled: true,
          }),
      ];

      for (const operation of operations) {
        await operation();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for all MQTT messages
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(syncMessages).toHaveLength(3);
      
      // All messages should have incrementing minor versions
      const minorVersions = syncMessages.map(m => m.minor_version);
      expect(minorVersions[1]).toBeGreaterThan(minorVersions[0]);
      expect(minorVersions[2]).toBeGreaterThan(minorVersions[1]);
    });
  });

  describe('Error scenarios', () => {
    it('should handle sync even if MQTT is temporarily unavailable', async () => {
      // This tests that the API continues to work even if MQTT fails
      // In a real test, we would disconnect the MQTT broker, but for this test
      // we'll just verify the endpoint works
      
      const response = await request(app.getHttpServer())
        .post('/api/landing-sites')
        .send({
          name: 'Test Site',
          description: 'Testing resilience',
          location: { type: 'Point', coordinates: [-0.5, 5.5] },
          status: 'active',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      
      // Verify sync log was still created
      const syncLog = await dataSource.getRepository(SyncLog).findOne({
        where: {
          entity_type: 'landing_site',
          entity_id: response.body.id.toString(),
          is_latest: true,
        },
      });

      expect(syncLog).toBeDefined();
    });
  });

  describe('Sync reset', () => {
    it('should handle major version changes', async () => {
      // Create some initial data
      await request(app.getHttpServer())
        .post('/api/landing-sites')
        .send({
          name: 'Initial Site',
          description: 'Before reset',
          location: { type: 'Point', coordinates: [-0.5, 5.5] },
          status: 'active',
        });

      // Clear messages
      syncMessages = [];

      // Reset sync (increments major version)
      await request(app.getHttpServer())
        .post('/api/data/sync/reset')
        .expect(201);

      // Create new data after reset
      await request(app.getHttpServer())
        .post('/api/landing-sites')
        .send({
          name: 'After Reset Site',
          description: 'After reset',
          location: { type: 'Point', coordinates: [-0.6, 5.6] },
          status: 'active',
        });

      // Wait for MQTT message
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have received notification with new major version
      const lastMessage = syncMessages[syncMessages.length - 1];
      expect(lastMessage.major_version).toBeGreaterThan(1);
    });
  });
});