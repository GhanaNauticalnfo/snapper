import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../../api/src/app/app.module';
import { DataSource } from 'typeorm';
import { Device, DeviceState } from '../../api/src/app/vessels/device/device.entity';
import { Vessel } from '../../api/src/app/vessels/vessel.entity';
import { VesselType } from '../../api/src/app/vessels/type/vessel-type.entity';

describe('MQTT Authentication E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testVessel: Vessel;
  let testDevice: Device;

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
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database
    await dataSource.getRepository(Device).delete({});
    await dataSource.getRepository(Vessel).delete({});
    await dataSource.getRepository(VesselType).delete({});

    // Create test vessel type
    const vesselType = await dataSource.getRepository(VesselType).save({
      name: 'Test Type',
      description: 'Test vessel type',
    });

    // Create test vessel
    testVessel = await dataSource.getRepository(Vessel).save({
      name: 'Test Vessel',
      vessel_type_id: vesselType.id,
      imo_number: '1234567',
      call_sign: 'TEST123',
      mmsi: '123456789',
    });

    // Create test device
    testDevice = await dataSource.getRepository(Device).save({
      device_id: 'test-device-123',
      vessel_id: testVessel.id,
      state: DeviceState.ACTIVE,
      auth_token: 'valid-device-token',
      activation_token: null,
      activated_at: new Date(),
      expires_at: null,
    });
  });

  describe('POST /api/mqtt/auth', () => {
    describe('API user authentication', () => {
      it('should authenticate API user with valid credentials', async () => {
        const originalPassword = process.env.MQTT_API_PASSWORD;
        process.env.MQTT_API_PASSWORD = 'test-mqtt-password';

        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('clientid=api-client-1&username=api&password=test-mqtt-password');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});

        process.env.MQTT_API_PASSWORD = originalPassword;
      });

      it('should reject API user with invalid password', async () => {
        const originalPassword = process.env.MQTT_API_PASSWORD;
        process.env.MQTT_API_PASSWORD = 'test-mqtt-password';

        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('clientid=api-client-1&username=api&password=wrong-password');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Unauthorized');

        process.env.MQTT_API_PASSWORD = originalPassword;
      });

      it('should use default password when env var not set', async () => {
        const originalPassword = process.env.MQTT_API_PASSWORD;
        delete process.env.MQTT_API_PASSWORD;

        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('clientid=api-client-1&username=api&password=mqtt_api_password');

        expect(response.status).toBe(200);

        process.env.MQTT_API_PASSWORD = originalPassword;
      });
    });

    describe('Device authentication', () => {
      it('should authenticate device with valid token and matching vessel ID', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(`clientid=vessel-${testVessel.id}&username=${testVessel.id}&password=valid-device-token`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
      });

      it('should reject device with mismatched vessel ID', async () => {
        const wrongVesselId = testVessel.id + 999;
        
        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(`clientid=vessel-${wrongVesselId}&username=${wrongVesselId}&password=valid-device-token`);

        expect(response.status).toBe(401);
      });

      it('should reject device with invalid token', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(`clientid=vessel-${testVessel.id}&username=${testVessel.id}&password=invalid-token`);

        expect(response.status).toBe(401);
      });

      it('should reject inactive device', async () => {
        // Update device to inactive
        await dataSource.getRepository(Device).update(
          { id: testDevice.id },
          { state: DeviceState.RETIRED }
        );

        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(`clientid=vessel-${testVessel.id}&username=${testVessel.id}&password=valid-device-token`);

        expect(response.status).toBe(401);
      });

      it('should reject device without vessel assignment', async () => {
        // Create device without vessel
        const orphanDevice = await dataSource.getRepository(Device).save({
          device_id: 'orphan-device',
          vessel_id: null,
          state: DeviceState.ACTIVE,
          auth_token: 'orphan-token',
          activated_at: new Date(),
        });

        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('clientid=vessel-null&username=null&password=orphan-token');

        expect(response.status).toBe(401);
      });
    });

    describe('Request format validation', () => {
      it('should handle missing parameters', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('');

        expect(response.status).toBe(401);
      });

      it('should handle URL encoded special characters', async () => {
        const originalPassword = process.env.MQTT_API_PASSWORD;
        process.env.MQTT_API_PASSWORD = 'p@ss&word=test';

        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('clientid=api-client&username=api&password=' + encodeURIComponent('p@ss&word=test'));

        expect(response.status).toBe(200);

        process.env.MQTT_API_PASSWORD = originalPassword;
      });

      it('should handle different content types gracefully', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/json')
          .send({
            clientid: 'api-client',
            username: 'api',
            password: 'mqtt_api_password',
          });

        // Should still work as NestJS can parse both
        expect(response.status).toBe(200);
      });
    });

    describe('Performance and edge cases', () => {
      it('should handle concurrent authentication requests', async () => {
        const promises = [];
        
        // Create 10 concurrent requests
        for (let i = 0; i < 10; i++) {
          promises.push(
            request(app.getHttpServer())
              .post('/api/mqtt/auth')
              .set('Content-Type', 'application/x-www-form-urlencoded')
              .send(`clientid=api-client-${i}&username=api&password=mqtt_api_password`)
          );
        }

        const responses = await Promise.all(promises);
        
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
      });

      it('should handle very long client IDs', async () => {
        const longClientId = 'a'.repeat(1000);
        
        const response = await request(app.getHttpServer())
          .post('/api/mqtt/auth')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send(`clientid=${longClientId}&username=api&password=mqtt_api_password`);

        expect(response.status).toBe(200);
      });
    });
  });
});