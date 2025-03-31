// apps/api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // Import ConfigService if injecting
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KmlDatasetModule } from './kml-dataset/kml-dataset.module';
import { VoltaDepthModule} from './volta-depth/volta-depth.module';
import { getDatabaseConfig } from '../config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load the appropriate .env file
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    // Use forRootAsync for better integration with ConfigModule
    TypeOrmModule.forRootAsync({
      // Although getDatabaseConfig doesn't use ConfigService directly now,
      // this pattern makes it easy if you later want to inject it.
      imports: [ConfigModule], // Make ConfigModule available if needed for injection
      useFactory: () => getDatabaseConfig(), // The factory still works as is
      // inject: [ConfigService], // Uncomment if getDatabaseConfig needed ConfigService
    }),
    KmlDatasetModule,
    VoltaDepthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}