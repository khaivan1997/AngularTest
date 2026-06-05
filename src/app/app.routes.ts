import { Routes } from '@angular/router';
import { FabricDrawingWrapperView } from './components/fabric-drawing-wrapper-view/fabric-drawing-wrapper-view';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'drawing',
  },
  {
    path: 'drawing',
    component: FabricDrawingWrapperView,
  },
];
