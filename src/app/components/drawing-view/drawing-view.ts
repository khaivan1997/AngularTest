import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { DrawingStore, type GridMode } from '../../store/drawing-store';
import { clamp } from '../../util/numeric.util';
import { DrawingItem } from '../drawing-item/drawing-item';

@Component({
  selector: 'app-drawing-view',
  standalone: true,
  templateUrl: './drawing-view.html',
  styleUrl: './drawing-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingView {
  private readonly drawingStore = inject(DrawingStore);
  protected readonly drawingWidth = 800;
  protected readonly drawingHeight = 600;
  protected readonly drawingViewBox = `0 0 ${this.drawingWidth} ${this.drawingHeight}`;
  protected readonly minimumZoom = 1;
  protected readonly maximumZoom = 5;
  protected readonly gridWidth = this.drawingWidth * this.maximumZoom;
  protected readonly gridHeight = this.drawingHeight * this.maximumZoom;
  protected readonly gridX = -(this.gridWidth - this.drawingWidth) / 2;
  protected readonly gridY = -(this.gridHeight - this.drawingHeight) / 2;
  private readonly cameraOffset = signal({ x: 0, y: 0 });
  private readonly zoomSensitivity = 0.4;
  protected readonly currentZoom = this.drawingStore.currentZoom;
  protected readonly zoomLabel = computed(() => `${Math.round(this.currentZoom() * 100)}%`);
  protected readonly drawingTransform = computed(() => {
    const offset = this.cameraOffset();

    return `translate(${offset.x} ${offset.y}) scale(${this.currentZoom()})`;
  });
  protected readonly activeTool = this.drawingStore.activeTool;
  protected readonly svgCursor = computed(() => (this.activeTool() === 'select' ? 'pointer' : 'crosshair'));
  protected readonly selectedEntities = this.drawingStore.signalSelectedEntities;
  private readonly drawingSvg = viewChild.required<ElementRef<SVGSVGElement>>('drawingSvg');
  private readonly drawingViewport = viewChild.required<ElementRef<SVGGElement>>('drawingViewport');
  private readonly drawingItems = viewChild.required<string, ViewContainerRef>('drawingItems', {
    read: ViewContainerRef,
  });

  protected readonly gridMode = this.drawingStore.gridMode;
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
    this.drawingStore.setGridMode(value);
  }

  protected onSelectTool(): void {
    this.drawingStore.setActiveTool('select');
  }

  protected onConnectTool(): void {
    this.drawingStore.setActiveTool('connect');
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();

    const viewport = this.drawingViewport().nativeElement;
    const svg = this.drawingSvg().nativeElement;
    const svgMatrix = svg.getScreenCTM();
    const viewportMatrix = viewport.getScreenCTM();

    if (!svgMatrix || !viewportMatrix) {
      return;
    }

    const pointerInSvg = new DOMPoint(event.clientX, event.clientY).matrixTransform(svgMatrix.inverse());
    const pointerInWorld = new DOMPoint(event.clientX, event.clientY).matrixTransform(viewportMatrix.inverse());
    const deltaInPixels =
      event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * window.innerHeight
          : event.deltaY;
    const zoomFactor = Math.pow(1 + this.zoomSensitivity, -deltaInPixels / 100);
    const nextZoom = clamp(this.currentZoom() * zoomFactor, this.minimumZoom, this.maximumZoom);

    if (nextZoom === this.currentZoom()) {
      return;
    }

    this.cameraOffset.set({
      x: pointerInSvg.x - pointerInWorld.x * nextZoom,
      y: pointerInSvg.y - pointerInWorld.y * nextZoom,
    });
    this.drawingStore.setCurrentZoom(nextZoom);
  }

  protected onDelete(): void {
    const selectedEntities = this.selectedEntities();

    if (selectedEntities.size === 0) {
      return;
    }

    for (const entity of [...selectedEntities]) {
      this.drawingStore.deleteEntity(entity.instance.itemId);
    }
  }

  protected onClear(): void {
    this.drawingStore.clear();
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();

    const templateId = event.dataTransfer?.getData('application/x-template-id');

    if (!templateId) {
      return;
    }

    const viewport = this.drawingViewport().nativeElement;
    const screenMatrix = viewport.getScreenCTM();

    if (!screenMatrix) {
      return;
    }

    const dropPosition = new DOMPoint(event.clientX, event.clientY).matrixTransform(screenMatrix.inverse());
    const snappedPosition = {
      x: this.drawingStore.snapToGridX(dropPosition.x),
      y: this.drawingStore.snapToGridY(dropPosition.y),
    };

    const drawingItemRef = this.drawingItems().createComponent(DrawingItem);
    drawingItemRef.setInput('templateHref', `#${templateId}`);
    drawingItemRef.setInput('posX', snappedPosition.x);
    drawingItemRef.setInput('posY', snappedPosition.y);
    drawingItemRef.changeDetectorRef.detectChanges();
    this.drawingStore.register(drawingItemRef);

    console.log('Template dropped', {
      templateId,
      dropPosition: { x: dropPosition.x, y: dropPosition.y },
      snappedPosition,
    });
  }
}
