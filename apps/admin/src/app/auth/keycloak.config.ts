import {
  provideKeycloak,
  createInterceptorCondition,
  IncludeBearerTokenCondition,
  INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
  withAutoRefreshToken,
  AutoRefreshTokenService,
  UserActivityService
} from 'keycloak-angular';
import { environment } from '../../environments/environment';

// Configure which URLs should receive Bearer tokens
const apiCondition = createInterceptorCondition<IncludeBearerTokenCondition>({
  // Match all API calls starting with /api
  urlPattern: /^\/api/i,
  bearerPrefix: 'Bearer'
});

// Also include any external API URLs from environment
const externalApiCondition = createInterceptorCondition<IncludeBearerTokenCondition>({
  urlPattern: new RegExp(`^${environment.apiUrl}(\\/.*)?$`, 'i'),
  bearerPrefix: 'Bearer'
});

export const provideKeycloakAngular = () =>
  provideKeycloak({
    config: {
      url: environment.keycloak?.url || 'http://localhost:8080',
      realm: environment.keycloak?.realm || 'ghanawaters',
      clientId: environment.keycloak?.clientId || 'ghanawaters-admin'
    },
    initOptions: {
      onLoad: 'login-required',
      silentCheckSsoRedirectUri:
        window.location.origin + '/assets/silent-check-sso.html',
      checkLoginIframe: false,
      enableLogging: !environment.production,
      pkceMethod: 'S256'
    },
    features: [
      withAutoRefreshToken({
        onInactivityTimeout: 'logout',
        sessionTimeout: 600000 // 10 minutes
      })
    ],
    providers: [
      AutoRefreshTokenService,
      UserActivityService,
      {
        provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
        useValue: [apiCondition, externalApiCondition]
      }
    ]
  });