// apps/admin/src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
  <div class="flex flex-col p-4 border">
    <h1 class="text-red-600 text-4xl">Test Nx Angular Tailwind v4</h1>
    <span>Running nx monorepo with angular 19 and tailwind v4</span>
  </div>
    <div class="app-container">
      <app-sidebar></app-sidebar>
      <main class="content-area">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }
    
    .content-area {
      flex: 1;
      padding: 20px;
      background-color: #f9f9f9;
      overflow-y: auto;
    }
  `]
})
export class AppComponent {}