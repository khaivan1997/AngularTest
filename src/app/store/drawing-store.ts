/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { computed, inject, Injectable, signal, type ComponentRef } from '@angular/core';
import type { DrawingItem } from '../components/drawing-item/drawing-item';
import { snapTo } from '../util/numeric.util';
import { TemplateStore } from './template-store';

export type DrawingTool = 'select' | 'connect';
export type GridMode = 'noGrid' | 'minorGrid' | 'majorGrid';

@Injectable({ providedIn: 'root' })
export class DrawingStore {
  private readonly templateStore = inject(TemplateStore);
  private readonly renderedEntities = signal<ReadonlyMap<string, ComponentRef<DrawingItem>>>(new Map());
  readonly entities = computed(() => this.renderedEntities().values());
  readonly signalSelectedEntities = signal<Set<ComponentRef<DrawingItem>>>(new Set());
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

  register(entity: ComponentRef<DrawingItem>) {
    this.renderedEntities.update((entities) => {
      const nextEntities = new Map(entities);
      nextEntities.set(entity.instance.itemId, entity);
      return nextEntities;
    });
  }

  setSelect(entity: ComponentRef<DrawingItem>, selected = true) {
    this.signalSelectedEntities.update((entities) => {
      const nextEntities = new Set(entities);

      if (selected) {
        nextEntities.add(entity);
      } else {
        nextEntities.delete(entity);
      }

      return nextEntities;
    });
  }

  selectAllById(itemId: string, selected: boolean) {
    this.signalSelectedEntities.update((entities) => {
      const nextEntities = new Set(entities);

      for (const entity of this.renderedEntities().values()) {
        if (entity.instance.hrefId() !== itemId) {
          continue;
        }

        if (selected) {
          nextEntities.add(entity);
        } else {
          nextEntities.delete(entity);
        }
      }

      return nextEntities;
    });
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
    const grid = this.gridDefinition();

    return grid === null ? value : snapTo(value, grid.tileWidth);
  }

  snapToGridY(value: number) {
    const grid = this.gridDefinition();

    return grid === null ? value : snapTo(value, grid.tileHeight);
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

    const selectedEntity = [...this.signalSelectedEntities()].find(
      (selected) => selected.instance.itemId === itemId,
    );

    if (selectedEntity) {
      this.setSelect(selectedEntity, false);
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
    this.signalSelectedEntities.set(new Set());

    for (const entity of entities) {
      entity.destroy();
    }
  }
}
