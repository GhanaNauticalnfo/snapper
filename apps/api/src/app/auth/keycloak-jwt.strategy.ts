import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(Strategy, 'keycloak-jwt') {
  private clientId: string;

  constructor(private configService: ConfigService) {
    const keycloakUrl = configService.get('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = configService.get('KEYCLOAK_REALM', 'ghanawaters');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use jwks-rsa to automatically fetch and cache the signing key
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
      issuer: `${keycloakUrl}/realms/${realm}`,
      algorithms: ['RS256'],
      // Don't validate audience since Keycloak doesn't always include it
      audience: false,
    });

    this.clientId = this.configService.get('KEYCLOAK_CLIENT_ID', 'ghanawaters-api');
  }

  async validate(payload: any) {
    // Validate that the token comes from one of our authorized clients
    // using the azp (authorized party) claim since Keycloak doesn't always include aud
    const authorizedClients = ['ghanawaters-admin', 'ghanawaters-frontend', this.clientId];
    if (!payload.azp || !authorizedClients.includes(payload.azp)) {
      console.error('Token validation failed: Invalid azp claim', payload.azp);
      return null; // Returning null will cause authentication to fail
    }

    const user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.preferred_username,
      username: payload.preferred_username,
      roles: this.extractRoles(payload),
    };

    return user;
  }

  private extractRoles(payload: any): string[] {
    const roles: string[] = [];
    
    // Extract realm roles
    if (payload.realm_access?.roles) {
      roles.push(...payload.realm_access.roles);
    }
    
    // Extract client roles
    if (payload.resource_access?.[this.clientId]?.roles) {
      roles.push(...payload.resource_access[this.clientId].roles);
    }
    
    // Remove default roles that aren't relevant for authorization
    const filteredRoles = roles.filter(role => 
      !['offline_access', 'uma_authorization', 'default-roles-ghanawaters'].includes(role)
    );
    
    return [...new Set(filteredRoles)];
  }
}