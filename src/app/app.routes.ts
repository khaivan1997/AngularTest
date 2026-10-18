import { Routes } from '@angular/router';
import { DrawingSheet } from './components/drawing-sheet/drawing-sheet';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'drawing',
  },
  {
    path: 'drawing',
    component: DrawingSheet,
  },
];
