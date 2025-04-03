import { Route } from '@angular/router';
import { AppMainComponent } from './layout/app.main.component';
import { KmlComponent } from './features/kml/kml.component';

export const routes: Route[] = [
  {
    path: 'app',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
  path: '',
  component: AppMainComponent,
  children: [
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'home2',
    loadComponent: () => import('./features/home2/home.component')
      .then(m => m.Home2Component)
  },
  {
    path: 'kml', component: KmlComponent,
  },
  {
    path: 'volta-depth',
    loadComponent: () => import('./features/volta-depth/volta-depth.component')
      .then(m => m.VoltaDepthComponent)
  }
]
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