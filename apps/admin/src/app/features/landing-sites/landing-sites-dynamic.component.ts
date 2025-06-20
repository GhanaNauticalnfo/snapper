import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingSiteListDynamicComponent } from './components/landing-site-list-dynamic.component';

@Component({
  selector: 'app-landing-sites-dynamic',
  standalone: true,
  imports: [
    CommonModule,
    LandingSiteListDynamicComponent
  ],
  template: `
    <div class="landing-sites-container">
      <app-landing-site-list-dynamic></app-landing-site-list-dynamic>
    </div>
  `,
  styles: [`
    .landing-sites-container {
      padding: 0 20px 20px 20px;
    }
  `]
})
export class LandingSitesDynamicComponent {}