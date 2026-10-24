import {ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, input, linkedSignal, untracked} from '@angular/core';
import type {Connection, ConnectionControlPoints, ConnectionExport, Endpoint} from '../../model/utilities';
import {ConnectionStore} from '../../store/connection-store';
import {ItemsStore} from '../../store/items-store';
import type {DrawingItem} from '../drawing-item/drawing-item';
import {DrawingStore} from '../../store/drawing-store';
import {getMidpoint} from '../../util/math-util';
import type {CurvePoints} from '../../util/math-util';

interface CurvePathInput {
  readonly fromStart: DOMPoint;
  readonly fromEnd: DOMPoint;
  readonly destinationStart: DOMPoint;
  readonly destinationEnd: DOMPoint;
}

interface ControlPointDrag {
  readonly pointerId: number;
  readonly controlPoint: 'from' | 'destination';
  readonly element: SVGCircleElement;
  readonly grabOffset: {
    readonly x: number;
    readonly y: number;
  };
}

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
  public readonly controlPoints = input<ConnectionControlPoints | null>(null);
  private controlPointDrag: ControlPointDrag | null = null;
  protected readonly currentEntity = computed(() => this.connectionStore.getEntity(this.connectionId()));
  protected readonly isSelected = computed(() => {
    const entity = this.currentEntity();

    return entity ? this.connectionStore.signalSelectedConnections().has(entity.componentRef) : false;
  });

  private readonly curvePathInput = computed(() => {
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

      return {
        fromStart: fromPosition,
        fromEnd: this.drawingStore.getPortEndPosition(fromPort, fromPosition),
        destinationStart: toPosition,
        destinationEnd: this.drawingStore.getPortEndPosition(toPort, toPosition),
      } satisfies CurvePathInput;
    });
  });

  protected readonly fromControlPoint = linkedSignal(() => {
    const controlPoints = this.controlPoints();

    if (controlPoints) {
      return new DOMPoint(controlPoints.pos1X, controlPoints.pos1Y);
    }

    return null;
  });

  protected readonly destinationControlPoint = linkedSignal(() => {
    const controlPoints = this.controlPoints();

    if (controlPoints) {
      return new DOMPoint(controlPoints.pos2X, controlPoints.pos2Y);
    }

    return null;
  });

  private readonly calculateDefaultControlPointsEffect = effect(() => {
    const curvePathInput = this.curvePathInput();

    untracked(() => {
      if (
        !curvePathInput
        || this.fromControlPoint() !== null
        || this.destinationControlPoint() !== null
      ) {
        return;
      }

      this.resetCurvePoints();
    });
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

  protected onControlPointPointerDown(event: PointerEvent, controlPoint: 'from' | 'destination'): void {
    if (this.drawingStore.activeTool() !== 'select' || !this.isSelected()) {
      return;
    }

    const element = event.currentTarget;
    const currentControlPoint = this.getControlPoint(controlPoint);
    const pointerPosition = this.getPointerPositionInViewport(event);

    if (!(element instanceof SVGCircleElement) || !currentControlPoint || !pointerPosition) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.controlPointDrag = {
      pointerId: event.pointerId,
      controlPoint,
      element,
      grabOffset: {
        x: currentControlPoint.x - pointerPosition.x,
        y: currentControlPoint.y - pointerPosition.y,
      },
    };
    element.setPointerCapture(event.pointerId);
  }

  private getControlPoint(controlPoint: 'from' | 'destination') {
    return controlPoint === 'from'
      ? this.fromControlPoint()
      : this.destinationControlPoint();
  }

  @HostListener('pointermove', ['$event'])
  protected onPointerMove(event: PointerEvent): void {
    const controlPointDrag = this.controlPointDrag;

    if (!controlPointDrag || controlPointDrag.pointerId !== event.pointerId) {
      return;
    }

    const pointerPosition = this.getPointerPositionInViewport(event);

    if (!pointerPosition) {
      return;
    }

    const nextControlPoint = new DOMPoint(
      pointerPosition.x + controlPointDrag.grabOffset.x,
      pointerPosition.y + controlPointDrag.grabOffset.y,
    );

    if (controlPointDrag.controlPoint === 'from') {
      this.fromControlPoint.set(nextControlPoint);
      return;
    }

    this.destinationControlPoint.set(nextControlPoint);
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  @HostListener('lostpointercapture', ['$event'])
  protected onPointerEnd(event: PointerEvent): void {
    this.finishControlPointDrag(event.pointerId);
  }

  private finishControlPointDrag(pointerId: number): void {
    const controlPointDrag = this.controlPointDrag;

    if (!controlPointDrag || controlPointDrag.pointerId !== pointerId) {
      return;
    }

    this.controlPointDrag = null;

    if (controlPointDrag.element.hasPointerCapture(pointerId)) {
      controlPointDrag.element.releasePointerCapture(pointerId);
    }
  }

  protected readonly path = computed(() => {
    const curvePathInput = this.curvePathInput();
    const fromControlPoint = this.fromControlPoint();
    const destinationControlPoint = this.destinationControlPoint();

    if (!curvePathInput || !fromControlPoint || !destinationControlPoint) {
      return null;
    }

    const pathPoints: CurvePoints = {
      midpoint: getMidpoint(curvePathInput.fromEnd, curvePathInput.destinationEnd),
      fromControlPoint,
      destinationControlPoint,
    };

    return this.drawingStore.createCurvePathFromPoints(
      curvePathInput.fromStart,
      curvePathInput.fromEnd,
      curvePathInput.destinationStart,
      curvePathInput.destinationEnd,
      pathPoints,
    );
  });

  private getEntityWithTransform(endpoint: Endpoint) {
    const entity = this.itemsStore.getEntity(endpoint.objectId);

    if (!entity) {
      return undefined;
    }

    return {
      entity: entity.instance,
      transformPosition: entity.instance.getCurrentTransformPosition(),
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

  private getPointerPositionInViewport(event: PointerEvent): DOMPoint | null {
    const viewportMatrix = this.viewport().getScreenCTM();

    if (!viewportMatrix) {
      return null;
    }

    return new DOMPoint(event.clientX, event.clientY).matrixTransform(viewportMatrix.inverse());
  }

  public resetCurvePoints(): void {
    const curvePathInput = this.curvePathInput();

    if (!curvePathInput) {
      return;
    }

    const curvePoints = this.drawingStore.calculateCurvePoints(
      curvePathInput.fromStart,
      curvePathInput.fromEnd,
      curvePathInput.destinationStart,
      curvePathInput.destinationEnd,
    );

    this.fromControlPoint.set(curvePoints.fromControlPoint);
    this.destinationControlPoint.set(curvePoints.destinationControlPoint);
  }

  public getConnectionExport(): ConnectionExport {
    let fromControlPoint = this.fromControlPoint();
    let destinationControlPoint = this.destinationControlPoint();

    if (!fromControlPoint || !destinationControlPoint) {
      this.resetCurvePoints();
      fromControlPoint = this.fromControlPoint();
      destinationControlPoint = this.destinationControlPoint();
    }

    if (!fromControlPoint || !destinationControlPoint) {
      throw new Error('Unable to calculate connector control points for export.');
    }

    return {
      connection: {...this.connection()},
      controlPoints: {
        pos1X: fromControlPoint.x,
        pos1Y: fromControlPoint.y,
        pos2X: destinationControlPoint.x,
        pos2Y: destinationControlPoint.y,
      },
    };
  }
}
