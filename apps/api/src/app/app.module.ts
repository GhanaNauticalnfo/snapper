import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KmlDatasetModule } from './kml-dataset/kml-dataset.module';
//import { KeycloakModule } from '../../old-keycloak/keycloak.module';
//import { KeycloakService } from '../../old-keycloak/keycloak.service';
import { getDatabaseConfig } from '../config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    KmlDatasetModule,
  ],
  controllers: [AppController],
  providers: [AppService /*, KeycloakService*/],
})
export class AppModule {}