import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  type ComponentRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import type {Connection, ConnectionControlPoints, DrawingExportObject} from '../../model/utilities';
import { ConnectionStore } from '../../store/connection-store';
import { DrawingStore, type GridMode } from '../../store/drawing-store';
import { ItemsStore } from '../../store/items-store';
import { clamp } from '../../util/numeric.util';
import { Connector } from '../connector/connector';
import { DrawingItem } from '../drawing-item/drawing-item';
import { MouseConnectionLine } from '../mouse-connection-line/mouse-connection-line';

interface ViewportDragState {
  readonly pointerId: number;
  readonly startPointer: DOMPoint;
  readonly startOffset: {
    readonly x: number;
    readonly y: number;
  };
}

@Component({
  selector: 'app-drawing-view',
  standalone: true,
  imports: [MouseConnectionLine],
  templateUrl: './drawing-view.html',
  styleUrl: './drawing-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingView {
  private readonly drawingStore = inject(DrawingStore);
  private readonly connectionStore = inject(ConnectionStore);
  private readonly itemsStore = inject(ItemsStore);
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
  private viewportDrag: ViewportDragState | null = null;
  protected readonly currentZoom = this.drawingStore.currentZoom;
  protected readonly zoomLabel = computed(() => `${Math.round(this.currentZoom() * 100)}%`);
  protected readonly drawingTransform = computed(() => {
    const offset = this.cameraOffset();

    return `translate(${offset.x} ${offset.y}) scale(${this.currentZoom()})`;
  });
  protected readonly activeTool = this.drawingStore.activeTool;
  protected readonly svgCursor = computed(() => {
    switch (this.activeTool()) {
      case 'move':
        return 'move';
      case 'select':
        return 'pointer';
      default:
        return 'crosshair';
    }
  });
  protected readonly selectedEntities = this.itemsStore.selectedEntities;
  protected readonly drawingSvg = viewChild.required<ElementRef<SVGSVGElement>>('drawingSvgElement');
  protected readonly drawingViewport = viewChild.required<ElementRef<SVGGElement>>('drawingViewportElement');
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

  protected onMoveTool(): void {
    this.drawingStore.setActiveTool('move');
  }

  protected onConnectTool(): void {
    this.drawingStore.setActiveTool('connect');
  }

  public getExportObject(): DrawingExportObject {
    return {
      items: this.itemsStore.getExportObject(),
      connections: this.connectionStore.getExportObject(),
    };
  }

  protected onImport(): void {
    const drawingText = window.prompt('Import drawing', '');

    if (drawingText === null) {
      return;
    }

    const drawing = JSON.parse(drawingText) as DrawingExportObject;

    for (const item of drawing.items) {
      this.addDrawingItem(
        item.itemId,
        item.templateRefId,
        item.transform.position.x,
        item.transform.position.y,
        item.transform.rotate ?? 0,
      );
    }

    for (const connection of drawing.connections) {
      this.addConnector(
        connection.connectionId,
        connection.connection,
        connection.controlPoints,
      );
    }
  }

  protected async onExport(): Promise<void> {
    const drawingExport = this.getExportObject();
    const drawingText = JSON.stringify(drawingExport);

    try {
      console.log('Drawing export copied to clipboard', drawingExport);
      await navigator.clipboard.writeText(drawingText);
    } catch (error) {
      console.error('Unable to copy drawing export to clipboard', error);
    }
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

    this.setCameraOffset({
      x: pointerInSvg.x - pointerInWorld.x * nextZoom,
      y: pointerInSvg.y - pointerInWorld.y * nextZoom,
    }, nextZoom);
    this.drawingStore.setCurrentZoom(nextZoom);
  }

  protected onViewportPointerDown(event: PointerEvent): void {
    if (this.drawingStore.resolveActiveTool(event) !== 'move') {
      return;
    }

    const startPointer = this.getPointerPositionInSvg(event);

    if (!startPointer) {
      return;
    }

    event.preventDefault();
    this.viewportDrag = {
      pointerId: event.pointerId,
      startPointer,
      startOffset: this.cameraOffset(),
    };
    this.drawingSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  protected onViewportPointerMove(event: PointerEvent): void {
    const viewportDrag = this.viewportDrag;

    if (!viewportDrag || viewportDrag.pointerId !== event.pointerId) {
      return;
    }

    const currentPointer = this.getPointerPositionInSvg(event);

    if (!currentPointer) {
      return;
    }

    this.setCameraOffset({
      x: viewportDrag.startOffset.x + currentPointer.x - viewportDrag.startPointer.x,
      y: viewportDrag.startOffset.y + currentPointer.y - viewportDrag.startPointer.y,
    }, this.currentZoom());
  }

  protected onViewportPointerEnd(event: PointerEvent): void {
    const viewportDrag = this.viewportDrag;

    if (!viewportDrag || viewportDrag.pointerId !== event.pointerId) {
      return;
    }

    this.viewportDrag = null;

    const svg = this.drawingSvg().nativeElement;

    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
  }

  protected onContextMenu(event: MouseEvent): void {
    if (this.drawingStore.activeTool() === 'select' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
    }
  }

  protected onDelete(): void {
    const selectedEntities = this.selectedEntities();
    const selectedConnections = this.connectionStore.signalSelectedConnections();

    if (selectedEntities.size === 0 && selectedConnections.size === 0) {
      return;
    }

    this.drawingStore.deleteSelected();
  }

  protected onRotateSelected(offset: number): void {
    this.drawingStore.rotateSelected(offset);
  }

  protected onClear(): void {
    this.itemsStore.clear();
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

    this.addDrawingItem('', templateId, snappedPosition.x, snappedPosition.y);

    console.log('Template dropped', {
      templateId,
      dropPosition: { x: dropPosition.x, y: dropPosition.y },
      snappedPosition,
    });
  }

  protected addNewConnection(connection: Connection): void {
    this.addConnector('', connection);
  }

  private addDrawingItem(
    itemId: string,
    templateId: string,
    posX: number,
    posY: number,
    rotate = 0,
  ): ComponentRef<DrawingItem> {
    if (typeof templateId !== 'string' || templateId.trim().length === 0) {
      throw new Error('A non-empty templateId is required to add a drawing item.');
    }

    const drawingItemRef = this.drawingItems().createComponent(DrawingItem);
    if (itemId) {
      drawingItemRef.setInput('itemId', itemId);
    }
    drawingItemRef.setInput('templateHref', `#${templateId}`);
    drawingItemRef.setInput('posX', posX);
    drawingItemRef.setInput('posY', posY);
    drawingItemRef.setInput('rotate', rotate);
    drawingItemRef.changeDetectorRef.detectChanges();
    this.itemsStore.register(drawingItemRef);

    return drawingItemRef;
  }

  private addConnector(
    connectionId: string,
    connection: Connection,
    controlPoints: ConnectionControlPoints | null = null,
  ): ComponentRef<Connector> {
    const connectorRef = this.drawingItems().createComponent(Connector);
    if (connectionId) {
      connectorRef.setInput('connectionId', connectionId);
    }
    connectorRef.setInput('connection', connection);
    connectorRef.setInput('controlPoints', controlPoints);
    connectorRef.setInput('viewport', this.drawingViewport().nativeElement);
    connectorRef.changeDetectorRef.detectChanges();
    this.connectionStore.register(connection, connectorRef);

    return connectorRef;
  }

  private getPointerPositionInSvg(event: PointerEvent): DOMPoint | null {
    const screenMatrix = this.drawingSvg().nativeElement.getScreenCTM();

    if (!screenMatrix) {
      return null;
    }

    return new DOMPoint(event.clientX, event.clientY).matrixTransform(screenMatrix.inverse());
  }

  private setCameraOffset(
    offset: {readonly x: number; readonly y: number},
    zoom: number,
  ): void {
    const minimumOffsetX = this.drawingWidth - this.drawingWidth * zoom;
    const minimumOffsetY = this.drawingHeight - this.drawingHeight * zoom;

    this.cameraOffset.set({
      x: clamp(offset.x, minimumOffsetX, 0),
      y: clamp(offset.y, minimumOffsetY, 0),
    });
  }
}
