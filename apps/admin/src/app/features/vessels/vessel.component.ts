// features/vessels/vessel.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { VesselListComponent } from './components/vessel-list.component';

@Component({
  selector: 'app-vessel',
  standalone: true,
  imports: [RouterModule, CommonModule, VesselListComponent],
  template: `
    <div class="vessel-container">
      <div class="page-header">
        <h2 class="text-2xl">Vessels</h2>
      </div>
      <app-vessel-list></app-vessel-list>
    </div>
  `,
  styles: [`
    .vessel-container {
      padding: 0 20px 20px 20px;
    }
  `]
})
export class VesselComponent {}