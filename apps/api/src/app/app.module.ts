import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//import { KeycloakModule } from '../../old-keycloak/keycloak.module';
//import { KeycloakService } from '../../old-keycloak/keycloak.service';

@Module({
//  imports: [KeycloakModule],
  controllers: [AppController],
  providers: [AppService /*, KeycloakService*/],
})
export class AppModule {}
