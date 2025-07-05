import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'activate',
    loadComponent: () => import('./activation/activation.component').then(m => m.ActivationComponent)
  },
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
  }
];
