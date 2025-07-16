import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RouteListComponent } from './components/route-list.component';

@Component({
  selector: 'app-routes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, RouteListComponent],
  template: `
    <div class="routes-container">
      <div class="page-header">
        <h2 class="text-2xl">Routes</h2>
      </div>
      <app-route-list></app-route-list>
    </div>
  `,
  styles: [`
    .routes-container {
      padding: 0 20px 20px 20px;
      height: 100%;
    }
  `]
})
export class RoutesComponent {}