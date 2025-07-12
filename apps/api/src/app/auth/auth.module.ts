import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KeycloakJwtStrategy } from './keycloak-jwt.strategy';
import { KeycloakAuthGuard } from './keycloak-auth.guard';
import { RolesGuard } from './roles.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [PassportModule],
  providers: [
    KeycloakJwtStrategy,
    // Apply KeycloakAuthGuard globally to all routes
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard,
    },
    // Apply RolesGuard globally to check roles when needed
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [PassportModule],
})
export class AuthModule {}