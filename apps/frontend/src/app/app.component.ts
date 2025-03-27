import { Component } from '@angular/core';
import { MapComponent } from '../map/map.component';

/*
@Component({
  imports: [RouterModule, ButtonComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
*/
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MapComponent],
  template: `
    <div class="container">
      <h1>MapLibre OSM Example123</h1>
      <div class="map-wrapper">
        <app-map 
          [initialCenter]="[0, 51.5]" 
          [initialZoom]="8">
        </app-map>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 0px;
    }
    .map-wrapper {
      width: 100%;
      height: 600px;
      border: 1px solid #ccc;
    }
  `]
})
export class AppComponent {
  title = 'frontend';
}
