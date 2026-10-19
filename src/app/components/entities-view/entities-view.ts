import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DrawingStore } from '../../store/drawing-store';
import { TemplateStore } from '../../store/template-store';

interface EntityRow {
  readonly id: string;
  readonly quantity: number;
  readonly name: string;
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
  private readonly templateStore = inject(TemplateStore);

  protected readonly entityRows = computed<readonly EntityRow[]>(() => {
    const quantities = new Map<string, number>();

    for (const entity of this.drawingStore.entities()) {
      const hrefId = entity.instance.hrefId();
      quantities.set(hrefId, (quantities.get(hrefId) ?? 0) + 1);
    }

    return [...quantities.entries()].map(([id, quantity]) => ({
      id,
      quantity,
      name: this.templateStore.getTemplate(id)?.name ?? id,
    }));
  });
}
