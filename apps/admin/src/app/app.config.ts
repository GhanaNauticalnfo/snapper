import { provideRouter } from '@angular/router';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { includeBearerTokenInterceptor } from 'keycloak-angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideKeycloakAngular } from './keycloak.config';
import { routes } from './app.routes';
import { MessageService, ConfirmationService } from 'primeng/api'; // Import MessageService and ConfirmationService
import Noir from '../themes/app-theme';
import { DebugLogService } from '@snapper/map';

export const appConfig: ApplicationConfig = {
  providers: [
  /*  provideKeycloakAngular(), */
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    //provideHttpClient(withInterceptors([includeBearerTokenInterceptor])),
    provideAnimationsAsync(),
    MessageService, // Provide MessageService globally
    ConfirmationService, // Provide ConfirmationService globally
    DebugLogService, // Provide DebugLogService globally
    providePrimeNG({ theme: Noir, ripple: false })
  ]
};