import { Component } from '@angular/core';
import { MapComponent } from '../../map/map.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MapComponent],
  template: `
    <div class="container">
      <h1>Ghana Maritime Authority - Vessel Tracking</h1>
      <div class="map-wrapper">
        <app-map 
          [initialCenter]="[-1.0, 6.5]" 
          [initialZoom]="7">
        </app-map>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 0px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    h1 {
      margin: 0;
      padding: 1rem;
      background: #1e3c72;
      color: white;
      font-size: 1.5rem;
    }
    .map-wrapper {
      flex: 1;
      width: 100%;
    }
  `]
})
export class HomeComponent {}