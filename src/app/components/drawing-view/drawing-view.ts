import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

type GridMode = 'noGrid' | 'minorGrid' | 'majorGrid';

@Component({
  selector: 'app-drawing-view',
  standalone: true,
  templateUrl: './drawing-view.html',
  styleUrl: './drawing-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingView {
  protected readonly drawingWidth = 800;
  protected readonly drawingHeight = 600;
  protected readonly drawingViewBox = `0 0 ${this.drawingWidth} ${this.drawingHeight}`;

  protected readonly gridMode = signal<GridMode>('majorGrid');
  protected readonly gridFill = computed(() => {
    switch (this.gridMode()) {
      case 'minorGrid':
        return 'url(#grid-minor)';
      case 'majorGrid':
        return 'url(#grid-major)';
      default:
        return null;
    }
  });

  protected onGridModeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as GridMode;
    this.gridMode.set(value);
  }
}
