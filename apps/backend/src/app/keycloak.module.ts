// apps/backend/src/app/keycloak/keycloak.module.ts
import { Module } from '@nestjs/common';
import { KeycloakConnectModule, AuthGuard, RoleGuard } from 'nest-keycloak-connect';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakService } from './keycloak.service';

@Module({
  imports: [
    KeycloakConnectModule.registerAsync({
      useFactory: (keycloakService: KeycloakService) => {
        return keycloakService.getKeycloakConfig();
      },
      inject: [KeycloakService],
    }),
  ],
  providers: [
    KeycloakService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
  exports: [KeycloakService],
})
export class KeycloakModule {}