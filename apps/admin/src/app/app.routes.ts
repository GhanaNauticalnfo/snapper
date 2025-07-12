import { Route } from '@angular/router';
import { AppMainComponent } from './layout/app.main.component';
import { KmlComponent } from './features/kml/kml.component';
import { VesselComponent } from './features/vessels/vessel.component';
import { LiveComponent } from './features/live/live.component';
import { RoutesComponent } from './features/routes/routes.component';
import { LandingSitesComponent } from './features/landing-sites/landing-sites.component';
import { authGuard } from './auth/auth.guard';

export const routes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./login.component').then(m => m.LoginComponent)
  },
  // Keycloak handles the callback internally, so this route is no longer needed
  // {
  //   path: 'auth/callback',
  //   loadComponent: () => import('./auth/auth-callback.component').then(m => m.AuthCallbackComponent)
  // },
  {
    path: 'forbidden',
    loadComponent: () => import('./forbidden/forbidden.component').then(m => m.ForbiddenComponent)
  },
  {
    path: 'app',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
  path: '',
  component: AppMainComponent,
  canActivate: [authGuard],
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
    canActivate: [authGuard],
    data: { roles: ['admin', 'operator'] },
    children: [
      {
        path: 'kml',
        component: KmlComponent,
        data: { roles: ['admin', 'operator'] }
      },
      {
        path: 'volta-depth',
        loadComponent: () => import('./features/volta-depth/volta-depth.component')
          .then(m => m.VoltaDepthComponent),
        data: { roles: ['admin', 'operator'] }
      },
      {
        path: 'routes', 
        component: RoutesComponent,
        data: { roles: ['admin', 'operator'] }
      },
      {
        path: 'tree-stubs',
        loadComponent: () => import('./features/tree-stubs/tree-stubs.component')
          .then(m => m.TreeStubsComponent),
        data: { roles: ['admin', 'operator'] }
      },
      {
        path: 'tree-stubs/:id',
        loadComponent: () => import('./features/tree-stubs/components/stub-editor.component')
          .then(m => m.StubEditorComponent),
        data: { roles: ['admin', 'operator'] }
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
    path: 'vessels', 
    component: VesselComponent,
    canActivate: [authGuard],
    data: { roles: ['admin', 'operator', 'viewer'] }
  },
  {
    path: 'landing-sites',
    component: LandingSitesComponent,
    canActivate: [authGuard],
    data: { roles: ['admin', 'operator'] }
  },
  {
    path: 'exports',
    loadComponent: () => import('./features/export/export.component')
      .then(m => m.ExportComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'operator'] }
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
    path: 'live', 
    component: LiveComponent,
    canActivate: [authGuard],
    data: { roles: ['admin', 'operator', 'viewer'] }
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component')
      .then(m => m.SettingsComponent),
    canActivate: [authGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'settings/vessel-types/:id',
    loadComponent: () => import('./features/settings/components/vessel-type-detail.component')
      .then(m => m.VesselTypeDetailComponent),
    canActivate: [authGuard],
    data: { roles: ['admin'] }
  },
]
  }
];