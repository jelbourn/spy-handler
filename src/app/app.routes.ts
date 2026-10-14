import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing').then((m) => m.LandingComponent),
  },
  {
    path: 'sign-up',
    loadComponent: () =>
      import('./pages/signup/signup').then((m) => m.SignupComponent),
  },
  {
    path: 'missions',
    loadComponent: () =>
      import('./pages/mission-select/mission-select').then(
        (m) => m.MissionSelectComponent
      ),
  },
  {
    path: 'active-mission',
    loadComponent: () =>
      import('./pages/handler-dashboard/handler-dashboard').then(
        (m) => m.HandlerDashboardComponent
      ),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./pages/mission-history/mission-history').then(
        (m) => m.MissionHistoryComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
