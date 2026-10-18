import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DrawingView } from '../drawing-view/drawing-view';
import { EntitiesView } from '../entities-view/entities-view';
import { PredefineSvgs } from '../predefine-svgs/predefine-svgs';
import { TemplateView } from '../template-view/template-view';

@Component({
  selector: 'app-drawing-sheet',
  standalone: true,
  imports: [DrawingView, EntitiesView, PredefineSvgs, TemplateView],
  templateUrl: './drawing-sheet.html',
  styleUrl: './drawing-sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingSheet {}
