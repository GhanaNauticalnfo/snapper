import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingSiteListComponent } from './components/landing-site-list.component';

@Component({
  selector: 'app-landing-sites',
  standalone: true,
  imports: [
    CommonModule,
    LandingSiteListComponent
  ],
  template: `
    <div class="landing-sites-container">
      <div class="page-header">
        <h2 class="text-2xl">Landing Sites</h2>
      </div>
      <app-landing-site-list></app-landing-site-list>
    </div>
  `,
  styles: [`
    .landing-sites-container {
      padding: 0 20px 20px 20px;
    }
  `]
})
export class LandingSitesComponent {}