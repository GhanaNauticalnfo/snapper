// apps/admin/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['admin'] }
  },
  // Add a forbidden route
  { 
    path: 'forbidden', 
    loadComponent: () => import('./forbidden/forbidden.component').then(m => m.ForbiddenComponent) 
  }
];