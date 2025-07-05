import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/layout/app.component';

// Suppress zone.js passive event warnings for PrimeNG components
(window as any).__zone_symbol__PASSIVE_EVENTS = ['scroll', 'touchstart', 'touchmove'];

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
