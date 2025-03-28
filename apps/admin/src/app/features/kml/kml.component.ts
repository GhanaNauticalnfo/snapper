// features/kml/kml.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-kml',
  standalone: true,
  imports: [RouterModule, CommonModule, ButtonModule, CardModule],
  template: `
    <p-card styleClass="kml-container">
      <ng-template pTemplate="title">
        <div class="header">
          <h1>KML Management</h1>
          <p-button label="New KML Document" icon="pi pi-plus" [routerLink]="['new']"></p-button>
        </div>
      </ng-template>
      
      <router-outlet></router-outlet>
    </p-card>
  `,
  styles: [`
    :host ::ng-deep .kml-container {
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
    }
    
    :host ::ng-deep .kml-container .p-card-body {
      padding: 0;
    }
    
    :host ::ng-deep .kml-container .p-card-content {
      padding: 0;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 0 1rem;
    }
    
    h1 {
      margin: 0;
      font-weight: 500;
    }
  `]
})
export class KmlComponent {}