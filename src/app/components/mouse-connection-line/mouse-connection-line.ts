import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import {DrawingStore} from '../../store/drawing-store';
import type {Connection, Endpoint, TemplatePortMetadata} from '../../model/utilities';

interface PortAtCursor {
  readonly element: SVGCircleElement;
  readonly endpoint: Endpoint;
  readonly port: TemplatePortMetadata;
  readonly position: DOMPoint;
  readonly endPosition: DOMPoint;
}

interface PortConnectionState {
  readonly pointerId: number;
  readonly endpoint: Endpoint;
  readonly position: DOMPoint;
  readonly endPosition: DOMPoint;
}

@Component({
  selector: 'g[mouse-connection-line]',
  standalone: true,
  templateUrl: './mouse-connection-line.html',
  styleUrl: './mouse-connection-line.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MouseConnectionLine implements AfterViewInit, OnDestroy {
  private readonly drawingStore = inject(DrawingStore);

  public readonly svg = input.required<SVGSVGElement>();
  public readonly viewport = input.required<SVGGElement>();
  readonly connectionCreated = output<Connection>();
  private readonly portConnectionState = signal<PortConnectionState | null>(null);
  private readonly starterPath = signal<string | null>(null);
  protected readonly previewPath = signal<string | null>(null);

  ngAfterViewInit(): void {
    const svg = this.svgElement;

    svg.addEventListener('pointerdown', this.onSvgPointerDown);
    svg.addEventListener('pointermove', this.onSvgPointerMove);
    svg.addEventListener('pointerup', this.onSvgPointerUp);
    svg.addEventListener('pointercancel', this.onSvgPointerCancel);
  }

  ngOnDestroy(): void {
    const svg = this.svgElement;

    svg.removeEventListener('pointerdown', this.onSvgPointerDown);
    svg.removeEventListener('pointermove', this.onSvgPointerMove);
    svg.removeEventListener('pointerup', this.onSvgPointerUp);
    svg.removeEventListener('pointercancel', this.onSvgPointerCancel);
  }

  private readonly onSvgPointerDown = (event: PointerEvent): void => {
    this.handlePointerDown(event);
  };

  private readonly onSvgPointerMove = (event: PointerEvent): void => {
    this.handlePointerMove(event);
  };

  private readonly onSvgPointerUp = (event: PointerEvent): void => {
    this.handlePointerUp(event);
  };

  private readonly onSvgPointerCancel = (event: PointerEvent): void => {
    this.handlePointerCancel(event);
  };

  private handlePointerDown(event: PointerEvent): void {
    if (this.drawingStore.activeTool() !== 'connect') {
      return;
    }

    const sourcePort = this.findPortAtCursor(event);

    if (!sourcePort) {
      return;
    }

    const portConnectionState: PortConnectionState = {
      pointerId: event.pointerId,
      endpoint: sourcePort.endpoint,
      position: sourcePort.position,
      endPosition: sourcePort.endPosition,
    };

    this.portConnectionState.set(portConnectionState);
    this.starterPath.set(this.createStarterPath(portConnectionState));
    this.previewPath.set(null);
  }

  private handlePointerMove(event: PointerEvent): void {
    const portConnectionState = this.portConnectionState();

    if (!portConnectionState || portConnectionState.pointerId !== event.pointerId) {
      return;
    }

    const starterPath = this.starterPath();

    if (!starterPath) {
      return;
    }

    const destinationPort = this.findPortAtCursor(
      event,
      (port, endpoint) =>
        (endpoint.objectId !== portConnectionState.endpoint.objectId ||
          endpoint.portId !== portConnectionState.endpoint.portId) &&
        port.id !== 'out',
    );

    if (destinationPort) {
      this.previewPath.set(this.drawingStore.createCurve(
        portConnectionState.position,
        portConnectionState.endPosition,
        destinationPort.position,
        destinationPort.endPosition,
      ));
      return;
    }

    const pointerPosition = this.getPointerPositionInViewport(event);

    if (!pointerPosition) {
      return;
    }

    const controlPoint = this.drawingStore.getCurveControlPoint(
      portConnectionState.position,
      portConnectionState.endPosition,
      pointerPosition,
    );

    this.previewPath.set(
      `${starterPath} Q ${controlPoint.x} ${controlPoint.y} ${pointerPosition.x} ${pointerPosition.y}`,
    );
  }

  private handlePointerUp(event: PointerEvent): void {
    const portConnectionState = this.portConnectionState();

    if (!portConnectionState || portConnectionState.pointerId !== event.pointerId) {
      return;
    }

    const destinationPort = this.findPortAtCursor(
      event,
      (port, endpoint) =>
        (endpoint.objectId !== portConnectionState.endpoint.objectId ||
          endpoint.portId !== portConnectionState.endpoint.portId) &&
        port.id !== 'out',
    );

    if (!destinationPort) {
      this.cancelPath();
      return;
    }

    const connection: Connection = {
      from: portConnectionState.endpoint,
      to: destinationPort.endpoint,
    };

    this.cancelPath();
    console.log('Connection created', connection);
    this.connectionCreated.emit(connection);
  }

  private handlePointerCancel(_event: PointerEvent): void {
    this.cancelPath();
  }

  private cancelPath(): void {
    this.portConnectionState.set(null);
    this.starterPath.set(null);
    this.previewPath.set(null);
  }

  private createStarterPath(portConnectionState: PortConnectionState): string {
    return `M ${portConnectionState.position.x} ${portConnectionState.position.y} L ${portConnectionState.endPosition.x} ${portConnectionState.endPosition.y}`;
  }

  private findPortAtCursor(
    event: PointerEvent,
    predicate: (port: TemplatePortMetadata, endpoint: Endpoint) => boolean = () => true,
  ): PortAtCursor | undefined {
    const target = event.target;

    if (!(target instanceof SVGCircleElement) || !target.classList.contains('drawing-item__port')) {
      return undefined;
    }

    const objectId = target.getAttribute('data-object-id');
    const portId = target.getAttribute('data-port-id');

    if (!objectId || !portId) {
      return undefined;
    }

    const port = this.drawingStore.getPort(objectId, portId);

    if (!port) {
      return undefined;
    }

    const endpoint: Endpoint = {objectId, portId};

    if (!predicate(port, endpoint)) {
      return undefined;
    }

    const position = this.getPortPosition(target);

    if (!position) {
      return undefined;
    }

    const portAtCursor: PortAtCursor = {
      element: target,
      endpoint,
      port,
      position,
      endPosition: this.drawingStore.getPortEndPosition(port, position),
    };

    return portAtCursor;
  }

  private getPortPosition(target: Element): DOMPoint | null {
    if (!(target instanceof SVGCircleElement)) {
      return null;
    }

    const portMatrix = target.getScreenCTM();
    const viewportMatrix = this.viewportElement.getScreenCTM();
    const x = target.cx.baseVal.value;
    const y = target.cy.baseVal.value;

    if (!portMatrix || !viewportMatrix) {
      return null;
    }

    return this.getViewportPosition(new DOMPoint(x, y).matrixTransform(portMatrix), viewportMatrix);
  }

  private getPointerPositionInViewport(event: PointerEvent): DOMPoint | null {
    const viewportMatrix = this.viewportElement.getScreenCTM();

    if (!viewportMatrix) {
      return null;
    }

    return this.getViewportPosition(new DOMPoint(event.clientX, event.clientY), viewportMatrix);
  }

  private getViewportPosition(positionInScreen: DOMPoint, viewportMatrix: DOMMatrix): DOMPoint {
    return positionInScreen.matrixTransform(viewportMatrix.inverse());
  }

  private get svgElement(): SVGSVGElement {
    return this.svg();
  }

  private get viewportElement(): SVGGElement {
    return this.viewport();
  }
}
