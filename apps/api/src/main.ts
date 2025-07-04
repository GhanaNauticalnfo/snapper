/**
 * This is not a production server yet!
 * This is only a minimal API to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['/']  // Exclude root path from global prefix so redirect works
  });

  // Enable validation for DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Enable CORS for cross-origin requests
  app.enableCors({
    origin: [
      // Production domains
      'https://snapper-admin.ghananautical.info',
      'https://snapper-frontend.ghananautical.info',
      // Test domains
      'https://snapper-test-admin.ghananautical.info',
      'https://snapper-test-frontend.ghananautical.info',
      // Development domains
      'http://localhost:4200',
      'http://localhost:4201',
      'http://localhost:4202',
      'http://localhost:4203'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Snapper API')
    .setDescription('Ghana Maritime Authority - Snapper API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Application health and status')
    .addTag('vessels', 'Vessel management and tracking')
    .addTag('vessel-types', 'Vessel type management')
    .addTag('vessel-telemetry', 'Real-time vessel telemetry')
    .addTag('devices', 'Device management and authentication')
    .addTag('routes', 'Navigation routes')
    .addTag('settings', 'Application settings management')
    .addTag('resource-settings', 'Resource-specific settings management')
    .addTag('landing-sites', 'Landing site management')
    .addTag('kml-datasets', 'KML dataset management')
    .addTag('volta-depth', 'Volta Lake depth tiles')
    .addTag('sync', 'Offline data synchronization')
    .addTag('tree-stubs', 'Tree stub hazard management')
    .addTag('tree-stub-groups', 'Tree stub group management')
    .addTag('gis', 'GIS and QGIS integration endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `🚀 Application is running on: http://0.0.0.0:${port}/${globalPrefix}`
  );
  Logger.log(
    `📚 API Documentation available at: http://0.0.0.0:${port}/${globalPrefix}/docs`
  );
}

bootstrap();
