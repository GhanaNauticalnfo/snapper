import { Route } from '@angular/router';

export const routes: Route[] = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'kml',
    loadComponent: () => import('./features/kml/kml.component')
      .then(m => m.KmlComponent)
  },
  {
    path: 'volta-depth',
    loadComponent: () => import('./features/volta-depth/volta-depth.component')
      .then(m => m.VoltaDepthComponent)
  }
];

/*
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
*/