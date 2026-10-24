/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { computed, inject, Injectable, signal, type ComponentRef } from '@angular/core';
import type { Connector } from '../components/connector/connector';
import type { DrawingItem } from '../components/drawing-item/drawing-item';
import type { TemplatePortMetadata } from '../model/utilities';
import {
  calculateCurveControlPoint,
  calculateCurvePoints as calculateCurvePointsUtil,
  calculatePortEndPosition,
  createCurvePath,
  createCurvePathFromPoints as createCurvePathFromPointsUtil,
} from '../util/math-util';
import type { CurvePoints } from '../util/math-util';
import { snapTo } from '../util/numeric.util';
import { ConnectionStore } from './connection-store';
import { ItemsStore } from './items-store';
import { TemplateStore } from './template-store';

export type DrawingTool = 'move' | 'select' | 'connect';
export type GridMode = 'noGrid' | 'minorGrid' | 'majorGrid';
export type SelectableElementRef = ComponentRef<DrawingItem> | ComponentRef<Connector>;

@Injectable({ providedIn: 'root' })
export class DrawingStore {
  private readonly connectionStore = inject(ConnectionStore);
  private readonly itemsStore = inject(ItemsStore);
  private readonly templateStore = inject(TemplateStore);
  readonly activeTool = signal<DrawingTool>('select');
  readonly currentZoom = signal(1);
  readonly gridMode = signal<GridMode>('majorGrid');
  private readonly gridDefinition = computed(() => {
    switch (this.gridMode()) {
      case 'minorGrid':
        return this.templateStore.gridMinor;
      case 'majorGrid':
        return this.templateStore.gridMajor;
      default:
        return null;
    }
  });

  setSelected(element: SelectableElementRef, selected: boolean, exclusive = true) {
    if (selected && exclusive) {
      this.itemsStore.selectedEntities.set(new Set());
      this.connectionStore.signalSelectedConnections.set(new Set());
    }

    if (element.instance.type === 'item') {
      this.itemsStore.setSelect(element as ComponentRef<DrawingItem>, selected);
      return;
    }

    this.connectionStore.setSelect(element as ComponentRef<Connector>, selected);
  }

  selectAllItemByITemplateId(itemId: string, selected: boolean, exclusive = true) {
    if (selected && exclusive) {
      this.itemsStore.selectedEntities.set(new Set());
      this.connectionStore.signalSelectedConnections.set(new Set());
    }

    this.itemsStore.selectAllItemByITemplateId(itemId, selected, false);
  }

  deleteSelected() {
    const selectedEntities = this.itemsStore.selectedEntities();

    this.connectionStore.deleteSelected();

    for (const entity of selectedEntities) {
      this.connectionStore.destroyForEntity(entity.instance.itemId());
    }

    this.itemsStore.deleteSelected();
  }

  setActiveTool(tool: DrawingTool) {
    this.activeTool.set(tool);
  }

  resolveActiveTool(event: PointerEvent): DrawingTool | null {
    if (event.button !== 0) {
      return null;
    }

    const activeTool = this.activeTool();

    return activeTool === 'select' && event.ctrlKey ? 'move' : activeTool;
  }

  setCurrentZoom(zoom: number) {
    this.currentZoom.set(zoom);
  }

  setGridMode(mode: GridMode) {
    this.gridMode.set(mode);
  }

  snapToGridX(value: number) {
    const grid = this.gridDefinition();

    return grid === null ? value : snapTo(value, grid.tileWidth);
  }

  snapToGridY(value: number) {
    const grid = this.gridDefinition();

    return grid === null ? value : snapTo(value, grid.tileHeight);
  }

  getGridUnit() {
    return this.gridDefinition()?.tileWidth ?? null;
  }

  getPortEndPosition(port: TemplatePortMetadata, position: DOMPoint) {
    const length = this.getGridUnit() ?? 10;

    return calculatePortEndPosition(port, position, length);
  }

  getCurveControlPoint(
    startPoint: DOMPoint,
    curvePoint: DOMPoint,
    destinationPoint: DOMPoint,
  ) {
    return calculateCurveControlPoint(
      startPoint,
      curvePoint,
      destinationPoint,
      this.getGridUnit() ?? 10,
    );
  }

  calculateCurvePoints(
    fromStart: DOMPoint,
    fromEnd: DOMPoint,
    destinationStart: DOMPoint,
    destinationEnd: DOMPoint,
  ) {
    return calculateCurvePointsUtil(
      fromStart,
      fromEnd,
      destinationStart,
      destinationEnd,
      this.getGridUnit() ?? 10,
    );
  }

  createCurvePathFromPoints(
    fromStart: DOMPoint,
    fromEnd: DOMPoint,
    destinationStart: DOMPoint,
    destinationEnd: DOMPoint,
    curvePoints: CurvePoints,
  ) {
    return createCurvePathFromPointsUtil(
      fromStart,
      fromEnd,
      destinationStart,
      destinationEnd,
      curvePoints,
    );
  }

  createCurve(
    fromStart: DOMPoint,
    fromEnd: DOMPoint,
    destinationStart: DOMPoint,
    destinationEnd: DOMPoint,
  ) {
    return createCurvePath(
      fromStart,
      fromEnd,
      destinationStart,
      destinationEnd,
      this.getGridUnit() ?? 10,
    );
  }

}
