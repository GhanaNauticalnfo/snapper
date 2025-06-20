import { Route } from '@angular/router';
import { AppMainComponent } from './layout/app.main.component';
import { KmlComponent } from './features/kml/kml.component';
import { VesselComponent } from './features/vessels/vessel.component';
import { LiveComponent } from './features/live/live.component';
import { RoutesComponent } from './features/routes/routes.component';
import { LandingSitesComponent } from './features/landing-sites/landing-sites.component';

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
    path: 'features',
    children: [
      {
        path: 'kml',
        component: KmlComponent
      },
      {
        path: 'volta-depth',
        loadComponent: () => import('./features/volta-depth/volta-depth.component')
          .then(m => m.VoltaDepthComponent)
      },
      {
        path: 'routes', 
        component: RoutesComponent
      },
      {
        path: 'tree-stubs',
        loadComponent: () => import('./features/tree-stubs/tree-stubs.component')
          .then(m => m.TreeStubsComponent)
      },
      {
        path: 'tree-stubs/:id',
        loadComponent: () => import('./features/tree-stubs/components/stub-editor.component')
          .then(m => m.StubEditorComponent)
      },
      {
        path: '',
        redirectTo: 'kml',
        pathMatch: 'full'
      }
    ]
  },
  // Backward compatibility redirects
  {
    path: 'kml',
    redirectTo: '/features/kml',
    pathMatch: 'full'
  },
  {
    path: 'volta-depth',
    redirectTo: '/features/volta-depth',
    pathMatch: 'full'
  },
  {
    path: 'vessels', component: VesselComponent,
  },
  {
    path: 'landing-sites',
    component: LandingSitesComponent
  },
  {
    path: 'exports',
    loadComponent: () => import('./features/export/export.component')
      .then(m => m.ExportComponent)
  },
  // Backward compatibility redirects for routes and tree-stubs
  {
    path: 'routes', 
    redirectTo: '/features/routes',
    pathMatch: 'full'
  },
  {
    path: 'tree-stubs',
    redirectTo: '/features/tree-stubs',
    pathMatch: 'full'
  },
  {
    path: 'tree-stubs/:id',
    redirectTo: '/features/tree-stubs/:id',
    pathMatch: 'full'
  },
  {
    path: 'live', component: LiveComponent,
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component')
      .then(m => m.SettingsComponent)
  },
  {
    path: 'settings/vessel-types/:id',
    loadComponent: () => import('./features/settings/components/vessel-type-detail.component')
      .then(m => m.VesselTypeDetailComponent)
  },
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