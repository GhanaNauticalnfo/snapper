// apps/api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigService
import { AppController } from './app.controller';
import { RootController } from './root.controller';
import { AppService } from './app.service';
import { KmlDatasetModule } from './kml-dataset/kml-dataset.module';
import { VoltaDepthModule } from './volta-depth/volta-depth.module';
// Import the CORRECT factory function from database.config.ts
import { typeOrmModuleOptionsFactory } from '../config/database.config';
// KmlDataset entity will be picked up by autoLoadEntities or by forFeature in its own module
// import { KmlDataset } from './kml-dataset/kml-dataset.entity';
import { VesselsModule } from './vessels/vessels.module';
import { RoutesModule } from './routes/routes.module';
import { SyncModule } from './sync/sync.module';
import { SettingsModule } from './settings/settings.module';
import { TreeStubsModule } from './tree-stubs/tree-stubs.module';
import { LandingSitesModule } from './landing-sites/landing-sites.module';
import { ResourceSettingsModule } from './resource-settings/resource-settings.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Good practice: Makes ConfigService available everywhere
      envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
    }),
    TypeOrmModule.forRootAsync({
      // Make ConfigModule available for injection into the factory
      imports: [ConfigModule],
      // Use the dedicated factory function we created/modified
      useFactory: typeOrmModuleOptionsFactory,
      // Inject the ConfigService (or any other services the factory needs)
      inject: [ConfigService],
      // --- Remove manual merging below ---
      // useFactory: () => { // OLD anonymous factory
      //   const config = getDatabaseConfig(); // ERROR was here
      //   return {
      //     ...config,
      //     autoLoadEntities: true, // Let the factory handle this
      //     entities: [KmlDataset], // Let the factory handle this or use forFeature
      //     logging: false, // Let the factory handle this
      //   };
      // },
    }),
    // Register auth module early so guards are available
    AuthModule,
    // Register feature modules AFTER TypeOrmModule.forRootAsync
    VesselsModule,
    KmlDatasetModule,
    VoltaDepthModule,
    RoutesModule,
    SyncModule,
    SettingsModule,
    TreeStubsModule,
    LandingSitesModule,
    ResourceSettingsModule,
    DatabaseModule,
  ],
  controllers: [AppController, RootController],
  providers: [AppService],
})
//
export class AppModule {}