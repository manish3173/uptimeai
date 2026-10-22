import { Routes } from '@angular/router';

import { ProfilePage } from './features/profile-page/profile-page';

export const routes: Routes = [
  { path: '', component: ProfilePage, title: 'GitHub Profile' },
  { path: '**', redirectTo: '' },
];
