import {ChangeDetectionStrategy, Component, computed, HostListener, inject, input, untracked} from '@angular/core';
import type {Connection, Endpoint} from '../../model/utilities';
import {ConnectionStore} from '../../store/connection-store';
import {ItemsStore} from '../../store/items-store';
import type {DrawingItem} from '../drawing-item/drawing-item';
import {DrawingStore} from '../../store/drawing-store';

@Component({
  selector: 'g[connector]',
  standalone: true,
  templateUrl: './connector.html',
  styleUrl: './connector.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.drawing-id]': 'connectionId()',
  },
})
export class Connector {
  public readonly type = 'connector' as const;
  private readonly drawingStore = inject(DrawingStore);
  private readonly connectionStore = inject(ConnectionStore);
  private readonly itemsStore = inject(ItemsStore);

  public readonly connectionId = input<string>(crypto.randomUUID());
  public readonly connection = input.required<Connection>();
  public readonly viewport = input.required<SVGGElement>();
  protected readonly currentEntity = computed(() => this.connectionStore.getEntity(this.connectionId()));
  protected readonly isSelected = computed(() => {
    const entity = this.currentEntity();

    return entity ? this.connectionStore.signalSelectedConnections().has(entity.componentRef) : false;
  });

  @HostListener('click')
  protected toggleSelected(): void {
    if (this.drawingStore.activeTool() !== 'select') {
      return;
    }

    const entity = this.currentEntity();

    if (!entity) {
      return;
    }

    this.drawingStore.setSelected(entity.componentRef, !this.isSelected());
  }

  protected readonly path = computed(() => {
    const connection = this.connection();
    const fromEntity = this.getEntityWithTransform(connection.from);
    const toEntity = this.getEntityWithTransform(connection.to);

    if (!fromEntity || !toEntity) {
      return null;
    }

    return untracked(() => {
      const fromPosition = this.getPortPosition(fromEntity.entity, connection.from.portId);
      const toPosition = this.getPortPosition(toEntity.entity, connection.to.portId);
      const fromPort = this.itemsStore.getPort(connection.from.objectId, connection.from.portId);
      const toPort = this.itemsStore.getPort(connection.to.objectId, connection.to.portId);

      if (!fromPosition || !toPosition || !fromPort || !toPort) {
        return null;
      }

      return this.drawingStore.createCurve(
        fromPosition,
        this.drawingStore.getPortEndPosition(fromPort, fromPosition),
        toPosition,
        this.drawingStore.getPortEndPosition(toPort, toPosition),
      );
    });
  });

  private getEntityWithTransform(endpoint: Endpoint) {
    const entity = this.itemsStore.getEntity(endpoint.objectId);

    if (!entity) {
      return undefined;
    }

    return {
      entity: entity.instance,
      transformPosition: entity.instance.currentTransformPosition(),
    };
  }

  private getPortPosition(entity: DrawingItem, portId: string): DOMPoint | undefined {
    const portElement = entity.getPortElement(portId);

    const portMatrix = portElement?.getScreenCTM();
    const viewportMatrix = this.viewport().getScreenCTM();

    if (!portElement || !portMatrix || !viewportMatrix) {
      return undefined;
    }

    const localPosition = new DOMPoint(
      portElement.cx.baseVal.value,
      portElement.cy.baseVal.value,
    );

    return localPosition
      .matrixTransform(portMatrix)
      .matrixTransform(viewportMatrix.inverse());
  }
}
