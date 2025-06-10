import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/layout/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
// Trigger deployment - Tir 10 Jun 2025 11:33:52 CEST
