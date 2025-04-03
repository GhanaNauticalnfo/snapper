// features/home/home.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-home2',
  standalone: true,
  template: `
    <div class="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <h1 class="text-3xl font-bold text-blue-600 mb-4">Home Dashboard</h1>
      <p class="text-gray-700 mb-6">Welcome to your application dashboard.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-blue-100 p-4 rounded-md hover:shadow-md transition-shadow">
          <h2 class="text-xl font-semibold text-blue-800">Quick Stats</h2>
          <p class="text-blue-600">Check your key metrics here</p>
        </div>
        <div class="bg-green-100 p-4 rounded-md hover:shadow-md transition-shadow">
          <h2 class="text-xl font-semibold text-green-800">Recent Activity</h2>
          <p class="text-green-600">See your latest actions</p>
        </div>
      </div>
    </div>
  `,
  styles: []  // Removed local styles in favor of Tailwind classes
})
export class Home2Component { }