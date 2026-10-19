import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Endpoint } from '../../model/utilities';
import { ConnectionStore } from '../../store/connection-store';
import { DrawingStore } from '../../store/drawing-store';
import { ItemsStore } from '../../store/items-store';
import { TemplateStore } from '../../store/template-store';

interface EntityRow {
  readonly id: string;
  readonly itemIds: readonly string[];
  readonly quantity: number;
  readonly name: string;
}

interface ConnectionRow {
  readonly id: string;
  readonly from: Endpoint;
  readonly to: Endpoint;
}

@Component({
  selector: 'app-entities-view',
  standalone: true,
  templateUrl: './entities-view.html',
  styleUrl: './entities-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntitiesView {
  private readonly drawingStore = inject(DrawingStore);
  private readonly connectionStore = inject(ConnectionStore);
  private readonly itemsStore = inject(ItemsStore);
  private readonly templateStore = inject(TemplateStore);

  protected readonly selectedTemplateIds = computed(() => {
    const selectedTemplateIds = new Set<string>();

    for (const entity of this.itemsStore.selectedEntities()) {
      selectedTemplateIds.add(entity.instance.hrefId());
    }

    return selectedTemplateIds;
  });

  protected onEntityRowClick(itemId: string): void {
    const selected = !this.selectedTemplateIds().has(itemId);

    this.drawingStore.selectAllItemByITemplateId(itemId, selected);
  }

  protected readonly entityRows = computed<readonly EntityRow[]>(() => {
    const itemsByTemplate = new Map<string, string[]>();

    for (const entity of this.itemsStore.entities()) {
      const hrefId = entity.instance.hrefId();
      const itemIds = itemsByTemplate.get(hrefId) ?? [];
      itemIds.push(entity.instance.itemId());
      itemsByTemplate.set(hrefId, itemIds);
    }

    return [...itemsByTemplate.entries()].map(([id, itemIds]) => ({
      id,
      itemIds,
      quantity: itemIds.length,
      name: this.templateStore.getTemplate(id)?.name ?? id,
    }));
  });

  protected readonly connectionRows = computed<readonly ConnectionRow[]>(() =>
    [...this.connectionStore.connectionEntries()].map(([id, renderedConnection]) => ({
      id,
      from: renderedConnection.connectionObj.from,
      to: renderedConnection.connectionObj.to,
    })),
  );
}
