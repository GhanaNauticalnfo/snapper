// apps/api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KmlDatasetModule } from './kml-dataset/kml-dataset.module';
import { VoltaDepthModule } from './volta-depth/volta-depth.module';
import { getDatabaseConfig } from '../config/database.config';
import { KmlDataset } from './kml-dataset/kml-dataset.entity';
import { VesselsModule } from './vessels/vessels.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const config = getDatabaseConfig();
        return {
          ...config,
          // Pick up entities registered via forFeature
          autoLoadEntities: true,
          // Explicitly register the entity
          entities: [KmlDataset],
          logging: false,
        };
      },
    }),
    VesselsModule,
    KmlDatasetModule,
    VoltaDepthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}