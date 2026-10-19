import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { DrawingStore } from '../../store/drawing-store';
import { ItemsStore } from '../../store/items-store';
import { TemplateStore } from '../../store/template-store';

interface DrawingItemBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface PointerDragState {
  readonly pointerId: number;
  readonly grabOffset: {
    readonly x: number;
    readonly y: number;
  };
  readonly wasSelected: boolean;
  moved: boolean;
}

@Component({
  selector: 'g[drawing-item]',
  standalone: true,
  templateUrl: './drawing-item.html',
  styleUrl: './drawing-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.drawing-id]': 'itemId()',
    '[attr.transform]': 'positionTransform()',
    '[class.is-selected]': 'isVisuallySelected()',
  },
})
export class DrawingItem implements AfterViewInit {
  public readonly type = 'item' as const;
  private readonly drawingStore = inject(DrawingStore);
  private readonly itemsStore = inject(ItemsStore);
  private readonly templateStore = inject(TemplateStore);
  private readonly hostElement = inject<ElementRef<SVGGElement>>(ElementRef);

  public readonly itemId = input<string>(crypto.randomUUID());
  protected readonly templateHref = input.required<string>();
  public readonly hrefId = computed(() => {
    const href = this.templateHref();

    return href.startsWith('#') ? href.slice(1) : href;
  });
  protected readonly ports = computed(() => this.templateStore.getTemplate(this.hrefId())?.ports ?? []);
  protected readonly posX = model.required<number>();
  protected readonly posY = model.required<number>();
  protected readonly currentEntity = computed(() => this.itemsStore.getEntity(this.itemId()));
  protected readonly isVisuallySelected = computed(
    () => {
      const entity = this.currentEntity();

      return entity ? this.itemsStore.selectedEntities().has(entity) : false;
    },
  );
  protected readonly arePortsVisible = computed(
    () => this.isVisuallySelected() || this.drawingStore.activeTool() === 'connect',
  );
  protected readonly bounds = signal<DrawingItemBounds | null>(null);
  protected readonly positionTransform = computed(() => `translate(${this.posX()} ${this.posY()})`);
  public readonly currentTransformPosition = computed(() => this.getCurrentTransformPosition());
  private readonly templateUse = viewChild.required<ElementRef<SVGUseElement>>('templateUse');
  private readonly portElements = viewChildren<ElementRef<SVGCircleElement>>('drawingPort');
  private pointerDrag: PointerDragState | null = null;

  ngAfterViewInit(): void {
    this.updateBounds();
  }

  public getPortElement(portId: string): SVGCircleElement | undefined {
    return this.portElements().find(
      (portElement) => portElement.nativeElement.getAttribute('data-port-id') === portId,
    )?.nativeElement;
  }

  public getCurrentTransformPosition(): { readonly position: DOMPoint } {
    return {
      position: new DOMPoint(this.posX(), this.posY()),
    };
  }

  @HostListener('pointerdown', ['$event'])
  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.drawingStore.activeTool() !== 'select') {
      return;
    }

    const entityRef = this.currentEntity();

    if (!entityRef) {
      return;
    }

    const pointerInWorld = this.pointerToWorld(event);

    if (!pointerInWorld) {
      return;
    }

    const wasSelected = this.itemsStore.selectedEntities().has(entityRef);

    if (!wasSelected) {
      this.drawingStore.setSelected(entityRef, true);
    }

    event.preventDefault();
    event.stopPropagation();
    this.pointerDrag = {
      pointerId: event.pointerId,
      grabOffset: {
        x: pointerInWorld.x - this.posX(),
        y: pointerInWorld.y - this.posY(),
      },
      wasSelected,
      moved: false,
    };
    this.hostElement.nativeElement.setPointerCapture(event.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  protected onPointerMove(event: PointerEvent): void {
    const pointerDrag = this.pointerDrag;

    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) {
      return;
    }

    const currentPoint = this.pointerToWorld(event);

    if (!currentPoint) {
      return;
    }

    pointerDrag.moved = true;
    const desiredX = currentPoint.x - pointerDrag.grabOffset.x;
    const desiredY = currentPoint.y - pointerDrag.grabOffset.y;

    this.posX.set(this.drawingStore.snapToGridX(desiredX));
    this.posY.set(this.drawingStore.snapToGridY(desiredY));
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  @HostListener('lostpointercapture', ['$event'])
  protected onPointerEnd(event: PointerEvent): void {
    this.finishPointerDrag(event.pointerId, event.type === 'pointerup');
  }

  private finishPointerDrag(pointerId: number, toggleSelection = true): void {
    const pointerDrag = this.pointerDrag;

    if (!pointerDrag || pointerDrag.pointerId !== pointerId) {
      return;
    }

    this.pointerDrag = null;

    const entityRef = this.currentEntity();

    if (entityRef && toggleSelection && pointerDrag.wasSelected && !pointerDrag.moved) {
      this.drawingStore.setSelected(entityRef, false);
    }

    if (this.hostElement.nativeElement.hasPointerCapture(pointerId)) {
      this.hostElement.nativeElement.releasePointerCapture(pointerId);
    }
  }

  private pointerToWorld(event: PointerEvent): DOMPoint | null {
    const viewport = this.hostElement.nativeElement.parentElement as SVGGraphicsElement | null;
    const screenMatrix = viewport?.getScreenCTM();

    if (!screenMatrix) {
      return null;
    }

    return new DOMPoint(event.clientX, event.clientY).matrixTransform(screenMatrix.inverse());
  }

  private updateBounds(): void {
    const templateUse = this.templateUse().nativeElement;

    const { x, y, width, height } = templateUse.getBBox();
    this.bounds.set({ x, y, width, height });
  }
}
