// apps/admin/src/app/app.component.ts
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { User } from '@ghanawaters/shared-models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
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
export class AppComponent {
  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      //console.log('Router Event:', event);
      
      if (event instanceof NavigationEnd) {
        console.log('Current URL:', event.url);
        console.log('Current route components:', this.router.routerState.snapshot.root);
      }
    });
  }
}