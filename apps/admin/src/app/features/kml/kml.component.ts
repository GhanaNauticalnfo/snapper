// features/kml/kml.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KmlListComponent } from './components/kml-list.component';

@Component({
  selector: 'app-kml',
  standalone: true,
  imports: [RouterModule, CommonModule, KmlListComponent],
  template: `
    <div class="kml-container">
      <div class="page-header">
        <h2>KML DataSets</h2>
      </div>
      <app-kml-list></app-kml-list>
    </div>
  `,
  styles: [`
    .kml-container {
      padding: 0 20px 20px 20px;
    }
  `]
})
export class KmlComponent {}