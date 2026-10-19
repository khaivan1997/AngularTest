/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {computed, inject, Injectable, signal, type ComponentRef} from '@angular/core';
import type {DrawingItem} from '../components/drawing-item/drawing-item';
import {TemplateStore} from './template-store';

@Injectable({providedIn: 'root'})
export class ItemsStore {
  private readonly templateStore = inject(TemplateStore);
  private readonly renderedEntities = signal<ReadonlyMap<string, ComponentRef<DrawingItem>>>(new Map());
  readonly entities = computed(() => this.renderedEntities().values());
  readonly selectedEntities = signal<Set<ComponentRef<DrawingItem>>>(new Set());

  register(entity: ComponentRef<DrawingItem>) {
    this.renderedEntities.update((entities) => {
      const nextEntities = new Map(entities);
      nextEntities.set(entity.instance.itemId(), entity);
      return nextEntities;
    });
  }

  setSelect(entity: ComponentRef<DrawingItem>, selected = true) {
    this.selectedEntities.update((entities) => {
      const nextEntities = new Set(entities);

      if (selected) {
        nextEntities.add(entity);
      } else {
        nextEntities.delete(entity);
      }

      return nextEntities;
    });
  }

  selectAllItemByITemplateId(itemId: string, selected: boolean, exclusive = true) {
    if (selected && exclusive) {
      this.selectedEntities.set(new Set());
    }

    this.selectedEntities.update((entities) => {
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

  getEntity(itemId: string) {
    return this.renderedEntities().get(itemId);
  }

  getPort(itemId: string, portId: string) {
    const entity = this.renderedEntities().get(itemId);

    if (!entity) {
      return undefined;
    }

    return this.templateStore.getTemplate(entity.instance.hrefId())?.ports.find((port) => port.id === portId);
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

    const selectedEntity = [...this.selectedEntities()].find(
      (selected) => selected.instance.itemId() === itemId,
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

  deleteSelected() {
    const selectedEntities = this.selectedEntities();

    for (const [itemId, entity] of this.renderedEntities()) {
      if (selectedEntities.has(entity)) {
        this.deleteEntity(itemId);
      }
    }
  }

  clear() {
    const entities = [...this.renderedEntities().values()];

    this.renderedEntities.set(new Map());
    this.selectedEntities.set(new Set());

    for (const entity of entities) {
      entity.destroy();
    }
  }
}
