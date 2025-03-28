// features/home/home.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="home-container">
      <h1>Home Dashboard</h1>
      <p>Welcome to your application dashboard.</p>
      <!-- Add your dashboard content here -->
    </div>
  `,
  styles: [`
    .home-container {
      padding: 20px;
    }
  `]
})
export class HomeComponent { }