import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KeycloakModule } from './keycloak.module';
import { KeycloakService } from './keycloak.service';

@Module({
  imports: [KeycloakModule],
  controllers: [AppController],
  providers: [AppService, KeycloakService],
})
export class AppModule {}
