/**
 * This is not a production server yet!
 * This is only a minimal API to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Snapper API')
    .setDescription('Ghana Maritime Authority - Snapper API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('vessels', 'Vessel management and tracking')
    .addTag('tracking', 'Real-time vessel tracking')
    .addTag('devices', 'Device management and authentication')
    .addTag('kml-datasets', 'KML dataset management')
    .addTag('volta-depth', 'Volta Lake depth tiles')
    .addTag('routes', 'Navigation routes')
    .addTag('markers', 'Map markers')
    .addTag('hazards', 'Navigation hazards')
    .addTag('sync', 'Offline data synchronization')
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
