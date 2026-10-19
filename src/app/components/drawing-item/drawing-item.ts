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
} from '@angular/core';
import { DrawingStore } from '../../store/drawing-store';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.transform]': 'positionTransform()',
    '[class.is-selected]': 'isVisuallySelected()',
  },
})
export class DrawingItem implements AfterViewInit {
  private readonly drawingStore = inject(DrawingStore);
  private readonly hostElement = inject<ElementRef<SVGGElement>>(ElementRef);

  public readonly itemId = crypto.randomUUID();
  protected readonly templateHref = input.required<string>();
  public readonly hrefId = computed(() => {
    const href = this.templateHref();

    return href.startsWith('#') ? href.slice(1) : href;
  });
  protected readonly posX = model.required<number>();
  protected readonly posY = model.required<number>();
  protected readonly currentEntity = computed(() => this.drawingStore.getEntity(this.itemId));
  protected readonly isVisuallySelected = computed(
    () => this.drawingStore.signalSelectedEntity() === this.currentEntity(),
  );
  protected readonly bounds = signal<DrawingItemBounds | null>(null);
  protected readonly positionTransform = computed(() => `translate(${this.posX()} ${this.posY()})`);
  private readonly templateUse = viewChild.required<ElementRef<SVGUseElement>>('templateUse');
  private pointerDrag: PointerDragState | null = null;

  ngAfterViewInit(): void {
    this.updateBounds();
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

    const currentEntity = this.drawingStore.signalSelectedEntity();
    const wasSelected = currentEntity === entityRef;

    if (!wasSelected) {
      this.drawingStore.selectEntity(entityRef);
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

    if (toggleSelection && pointerDrag.wasSelected && !pointerDrag.moved) {
      this.drawingStore.selectEntity(null);
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
