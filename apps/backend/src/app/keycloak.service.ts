import { Injectable } from '@nestjs/common';
import { KeycloakConnectOptions } from 'nest-keycloak-connect';

@Injectable()
export class KeycloakService {
  private keycloakConfig: KeycloakConnectOptions;

  constructor() {
    this.keycloakConfig = {
      authServerUrl: 'http://localhost:8080',
      realm: 'nx-project',
      clientId: 'backend-service',
      secret: 'your-client-secret',
    };
  }

  getKeycloakConfig(): KeycloakConnectOptions {
    return this.keycloakConfig;
  }
}