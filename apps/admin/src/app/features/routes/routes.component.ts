import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RouteListComponent } from './components/route-list.component';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, RouterModule, RouteListComponent],
  template: `
    <div class="routes-container">
      <app-route-list></app-route-list>
    </div>
  `,
  styles: [`
    .routes-container {
      height: 100%;
    }
  `]
})
export class RoutesComponent {}