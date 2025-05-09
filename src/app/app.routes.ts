import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/posts', pathMatch: 'full' },
  { path: 'posts', loadComponent: () => import('./components/post-list/post-list.component').then(m => m.PostListComponent) },
  { path: 'posts/create', loadComponent: () => import('./components/post-create/post-create.component').then(m => m.PostCreateComponent) },
  { path: 'posts/:id', loadComponent: () => import('./components/post-details/post-details.component').then(m => m.PostDetailsComponent) },
];
