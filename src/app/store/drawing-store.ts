/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { computed, Injectable, signal, type ComponentRef } from '@angular/core';
import type { DrawingItem } from '../components/drawing-item/drawing-item';
import { snapTo } from '../util/numeric.util';

export type DrawingTool = 'select' | 'connect';
export type GridMode = 'noGrid' | 'minorGrid' | 'majorGrid';

@Injectable({ providedIn: 'root' })
export class DrawingStore {
  private readonly renderedEntities = signal<ReadonlyMap<string, ComponentRef<DrawingItem>>>(new Map());
  readonly entities = computed(() => this.renderedEntities().values());
  readonly signalSelectedEntity = signal<ComponentRef<DrawingItem> | null>(null);
  readonly activeTool = signal<DrawingTool>('select');
  readonly currentZoom = signal(1);
  readonly gridMode = signal<GridMode>('majorGrid');
  private readonly gridUnit = computed<number | null>(() => {
    switch (this.gridMode()) {
      case 'minorGrid':
        return 10;
      case 'majorGrid':
        return 20;
      default:
        return null;
    }
  });

  register(entity: ComponentRef<DrawingItem>) {
    this.renderedEntities.update((entities) => {
      const nextEntities = new Map(entities);
      nextEntities.set(entity.instance.itemId, entity);
      return nextEntities;
    });
  }

  selectEntity(entity: ComponentRef<DrawingItem> | null) {
    this.signalSelectedEntity.set(entity);
  }

  setActiveTool(tool: DrawingTool) {
    this.activeTool.set(tool);
  }

  setCurrentZoom(zoom: number) {
    this.currentZoom.set(zoom);
  }

  setGridMode(mode: GridMode) {
    this.gridMode.set(mode);
  }

  snapToGridX(value: number) {
    const unit = this.gridUnit();

    return unit === null ? value : snapTo(value, unit);
  }

  snapToGridY(value: number) {
    const unit = this.gridUnit();

    return unit === null ? value : snapTo(value, unit);
  }

  getEntity(itemId: string) {
    return this.renderedEntities().get(itemId);
  }

  deregister(itemId: string) {
    const entity = this.renderedEntities().get(itemId);

    if (entity) {
      this.renderedEntities.update((entities) => {
        const nextEntities = new Map(entities);
        nextEntities.delete(itemId);
        return nextEntities;
      });
    }

    if (this.signalSelectedEntity()?.instance.itemId === itemId) {
      this.selectEntity(null);
    }
  }

  deleteEntity(itemId: string) {
    const entity = this.renderedEntities().get(itemId);

    if (!entity) {
      return;
    }

    this.deregister(itemId);
    entity.destroy();
  }

  clear() {
    const entities = [...this.renderedEntities().values()];

    this.renderedEntities.set(new Map());
    this.selectEntity(null);

    for (const entity of entities) {
      entity.destroy();
    }
  }
}
