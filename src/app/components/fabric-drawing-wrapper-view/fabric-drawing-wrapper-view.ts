import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import * as fabric from 'fabric';

type ToolMode = 'select' | 'freehand';
type PanelTab = 'hierarchy' | 'json';
interface SceneItem {
  id: string;
  label: string;
  type: string;
  depth: number;
  hasChildren: boolean;
  visible: boolean;
  connectorLabels: Array<{ id: string; label: string }>;
}

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1200;
const DEFAULT_STATUS = 'Fabric drafting starter ready.';
const DEFAULT_FILL_COLOR = '#d7e8f6';
const SERIALIZED_PROPERTIES = ['sceneId', 'sceneLabel', 'isLabel', 'isConnector', 'connectorTargetId', 'connectorLabelId', 'isCustomGroup'];

@Component({
  selector: 'app-fabric-drawing-wrapper-view',
  standalone: true,
  templateUrl: './fabric-drawing-wrapper-view.html',
  styleUrl: './fabric-drawing-wrapper-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FabricDrawingWrapperView implements AfterViewInit, OnDestroy {
  @ViewChild('fabricCanvas', { static: true })
  private readonly fabricCanvasRef?: ElementRef<HTMLCanvasElement>;

  protected readonly tool = signal<ToolMode>('select');
  protected readonly status = signal(DEFAULT_STATUS);
  protected readonly sceneJson = signal('');
  protected readonly sceneItems = signal<SceneItem[]>([]);
  protected readonly sortedSceneItems = computed(() => {
    const connectorSortLabel = (item: SceneItem): string => {
      const connectorLabels = item.connectorLabels
        .map((connectorLabel) => connectorLabel.label.trim())
        .filter((label) => label.length > 0)
        .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }));
      return connectorLabels[0] ?? '\uffff';
    };

    return [...this.sceneItems()].sort((left, right) => (
      connectorSortLabel(left).localeCompare(connectorSortLabel(right), undefined, { sensitivity: 'base', numeric: true })
      || left.label.localeCompare(right.label, undefined, { sensitivity: 'base', numeric: true })
      || left.type.localeCompare(right.type, undefined, { sensitivity: 'base' })
      || left.id.localeCompare(right.id, undefined, { sensitivity: 'base' })
    ));
  });
  protected readonly selectedSceneIds = signal<string[]>([]);
  protected readonly activeTab = signal<PanelTab>('hierarchy');
  protected readonly showHierarchyChildren = signal(true);
  protected readonly showLabeledGroupsOnly = signal(false);
  protected readonly fillColor = signal(DEFAULT_FILL_COLOR);

  private canvas?: fabric.Canvas;
  private nextId = 1;
  private allSceneItems: SceneItem[] = [];
  private readonly disposers: (() => void)[] = [];

  public ngAfterViewInit(): void {
    const canvasElement = this.fabricCanvasRef?.nativeElement;
    if (!canvasElement) {
      return;
    }

    const canvas = new fabric.Canvas(canvasElement, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#fbfdff',
      preserveObjectStacking: true,
      selection: true,
      selectionKey: ['ctrlKey', 'metaKey'],
    });

    const brush = new fabric.PencilBrush(canvas);
    brush.color = '#2d5bff';
    brush.width = 2;

    canvas.freeDrawingBrush = brush;
    this.canvas = canvas;
    this.initializeScene();
    this.bindCanvasEvents(canvas);
    this.applyToolMode();
    this.refreshSceneState();
  }

  public ngOnDestroy(): void {
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers.length = 0;
    this.canvas?.dispose();
    this.canvas = undefined;
  }

  @HostListener('window:keydown', ['$event'])
  protected onWindowKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Backspace' && event.key !== 'Delete') {
      return;
    }

    if (this.isTextInputTarget(event.target)) {
      return;
    }

    const activeObject = this.canvas?.getActiveObject();
    if (activeObject instanceof fabric.IText && activeObject.isEditing) {
      return;
    }

    const deletedCount = this.deleteSelectedObjects();
    if (deletedCount > 0) {
      event.preventDefault();
    }
  }

  protected setTool(tool: ToolMode): void {
    this.tool.set(tool);
    this.applyToolMode();
    this.status.set(tool === 'freehand' ? 'Freehand drawing enabled.' : 'Selection mode enabled.');
  }

  protected addRectangle(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const rect = new fabric.Rect({
      left: 160,
      top: 140,
      width: 180,
      height: 96,
      rx: 14,
      ry: 14,
      fill: '#eef6ff',
      stroke: '#203038',
      strokeWidth: 2,
    });

    this.attachMetadata(rect, 'Rectangle');
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Added rectangle.');
  }

  protected addCircle(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const circle = new fabric.Circle({
      left: 420,
      top: 170,
      radius: 52,
      fill: '#ffffff',
      stroke: '#203038',
      strokeWidth: 2,
    });

    this.attachMetadata(circle, 'Circle');
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Added circle.');
  }

  protected addTriangle(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const triangle = new fabric.Triangle({
      left: 520,
      top: 180,
      width: 120,
      height: 120,
      fill: '#ffffff',
      stroke: '#203038',
      strokeWidth: 2,
    });

    this.attachMetadata(triangle, 'Triangle');
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Added triangle.');
  }

  protected addLine(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const line = new fabric.Line([560, 180, 760, 320], {
      stroke: '#6b7f8f',
      strokeWidth: 3,
    });

    this.attachMetadata(line, 'Line');
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Added line.');
  }

  protected addCylinder(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const body = new fabric.Rect({
      left: 0,
      top: 18,
      width: 120,
      height: 96,
      fill: '#eef6ff',
      stroke: '#203038',
      strokeWidth: 2,
      originX: 'center',
      originY: 'top',
    });

    const topCap = new fabric.Ellipse({
      left: 0,
      top: 18,
      rx: 60,
      ry: 18,
      fill: '#ffffff',
      stroke: '#203038',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
    });

    const bottomCap = new fabric.Ellipse({
      left: 0,
      top: 114,
      rx: 60,
      ry: 18,
      fill: '#d7e8f6',
      stroke: '#203038',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
    });

    this.attachMetadata(body, 'Cylinder Body');
    this.attachMetadata(topCap, 'Cylinder Top');
    this.attachMetadata(bottomCap, 'Cylinder Bottom');

    const cylinder = new fabric.Group([body, bottomCap, topCap], {
      left: 780,
      top: 160,
    });

    this.attachMetadata(cylinder, 'Cylinder');
    canvas.add(cylinder);
    canvas.setActiveObject(cylinder);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Added cylinder.');
  }

  protected addCircularRingSector(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const circularRingSector = new fabric.Path('M 30 10 L 10 10 A 80 80 0 0 0 90 90 L 90 70 A 60 60 0 0 1 30 10 Z', {
      left: 640,
      top: 170,
      fill: '#eef6ff',
      stroke: '#203038',
      strokeWidth: 3,
      scaleX: 1.2,
      scaleY: 1.2,
    });

    this.attachMetadata(circularRingSector, 'Circular Ring Sector');
    canvas.add(circularRingSector);
    canvas.setActiveObject(circularRingSector);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Added circular ring sector.');
  }

  protected addPath(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const pathInput = window.prompt('Paste SVG path data', 'M 10 10 L 90 10 L 90 90 L 10 90 Z');
    if (pathInput === null) {
      return;
    }

    const pathData = pathInput.trim();
    if (!pathData) {
      this.status.set('Path input cancelled.');
      return;
    }

    try {
      const customPath = new fabric.Path(pathData, {
        left: 560,
        top: 210,
        fill: '#eef6ff',
        stroke: '#203038',
        strokeWidth: 2,
      });

      this.attachMetadata(customPath, 'Custom Path');
      customPath.setCoords();
      this.ensureObjectWithinCanvas(customPath, canvas);
      canvas.add(customPath);
      canvas.setActiveObject(customPath);
      canvas.requestRenderAll();
      this.refreshSceneState();
      this.status.set('Added custom path.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parse error';
      this.status.set(`Invalid path: ${message}`);
    }
  }

  protected async addSvg(): Promise<void> {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const svgInput = window.prompt(
      'Paste full SVG markup',
      '<svg viewBox="0 0 100 100"><path d="M 10 10 L 90 10 L 90 90 L 10 90 Z" /></svg>',
    );
    if (svgInput === null) {
      return;
    }

    const svgMarkup = svgInput.trim();
    if (!svgMarkup) {
      this.status.set('SVG input cancelled.');
      return;
    }

    try {
      const { objects, options } = await fabric.loadSVGFromString(svgMarkup);
      const drawableObjects = objects.filter((object): object is fabric.FabricObject => !!object);
      if (drawableObjects.length === 0) {
        this.status.set('SVG has no drawable objects.');
        return;
      }

      const customSvg = fabric.util.groupSVGElements(drawableObjects, options);
      customSvg.set({
        left: 560,
        top: 210,
      });

      this.attachMetadata(customSvg, 'Custom SVG');
      this.ensureSceneMetadata(customSvg);
      customSvg.setCoords();
      this.ensureObjectWithinCanvas(customSvg, canvas);
      canvas.add(customSvg);
      canvas.setActiveObject(customSvg);
      canvas.requestRenderAll();
      this.refreshSceneState();
      this.status.set('Added custom SVG.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parse error';
      this.status.set(`Invalid SVG: ${message}`);
    }
  }

  protected addText(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const text = new fabric.IText('Free text', {
      left: 260,
      top: 340,
      fontSize: 24,
      fill: '#203038',
    });

    this.attachMetadata(text, 'Text');
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Added text.');
  }

  protected addLabel(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const label = new fabric.IText('10', {
      left: 320,
      top: 220,
      fontSize: 28,
      fontWeight: '700',
      fill: '#203038',
      backgroundColor: '#fbfdff',
      lockRotation: true,
      hasControls: true,
    });

    this.attachMetadata(label, 'Label');
    label.set('isLabel', true);
    canvas.add(label);
    canvas.setActiveObject(label);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Added label.');
  }

  protected clearScene(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    canvas.clear();
    canvas.backgroundColor = '#fbfdff';
    this.nextId = 1;
    this.initializeScene();
    this.applyToolMode();
    this.refreshSceneState();
    this.status.set('Scene reset to blank drafting surface.');
  }

  protected exportScene(): void {
    this.refreshSceneState();
    const sceneJson = this.sceneJson();
    if (!navigator.clipboard?.writeText) {
      this.status.set('Scene JSON refreshed. Clipboard is unavailable in this browser context.');
      return;
    }

    void navigator.clipboard.writeText(sceneJson).then(
      () => {
        this.status.set('Scene JSON refreshed and copied to clipboard.');
      },
      () => {
        this.status.set('Scene JSON refreshed, but clipboard copy failed.');
      },
    );
  }

  protected async duplicateSelection(): Promise<void> {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const selectedObjects = this.getSelectedCanvasObjects();
    if (selectedObjects.length === 0) {
      this.status.set('Select at least one object first.');
      return;
    }

    const duplicates = await Promise.all(selectedObjects.map((object) => object.clone(SERIALIZED_PROPERTIES)));
    canvas.discardActiveObject();

    for (const duplicate of duplicates) {
      this.assignDuplicateMetadata(duplicate);
      duplicate.set({
        left: (duplicate.left ?? 0) + 28,
        top: (duplicate.top ?? 0) + 28,
      });
      duplicate.setCoords();
      this.ensureObjectWithinCanvas(duplicate, canvas);
      canvas.add(duplicate);
    }

    if (duplicates.length === 1) {
      canvas.setActiveObject(duplicates[0]);
    } else {
      canvas.setActiveObject(new fabric.ActiveSelection(duplicates, { canvas }));
    }

    this.bringConnectorsToFront();
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.updateSelectionStatus();
    this.status.set(`Duplicated ${duplicates.length} object${duplicates.length > 1 ? 's' : ''}.`);
  }

  protected toggleHierarchyChildren(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.showHierarchyChildren.set(input.checked);
    this.applyHierarchyFilter();
  }

  protected toggleLabeledGroupsOnly(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.showLabeledGroupsOnly.set(input.checked);
    this.applyHierarchyFilter();
  }

  protected bringSelectionToFront(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const selectedObjects = this.getSelectedCanvasObjects();
    if (selectedObjects.length === 0) {
      this.status.set('Select at least one object first.');
      return;
    }

    for (const object of selectedObjects) {
      canvas.bringObjectToFront(object);
    }

    this.bringConnectorsToFront();
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.updateSelectionStatus();
    this.status.set(`Moved ${selectedObjects.length} object${selectedObjects.length > 1 ? 's' : ''} to front.`);
  }

  protected sendSelectionToBack(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const selectedObjects = this.getSelectedCanvasObjects();
    if (selectedObjects.length === 0) {
      this.status.set('Select at least one object first.');
      return;
    }

    for (const object of selectedObjects) {
      canvas.sendObjectToBack(object);
    }

    this.bringConnectorsToFront();
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.updateSelectionStatus();
    this.status.set(`Moved ${selectedObjects.length} object${selectedObjects.length > 1 ? 's' : ''} to back.`);
  }

  protected fillSelection(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const selectedObjects = this.getSelectedCanvasObjects();
    if (selectedObjects.length === 0) {
      this.status.set('Select at least one object first.');
      return;
    }

    let filledCount = 0;
    for (const object of selectedObjects) {
      filledCount += this.fillObjectIfSupported(object);
    }

    if (filledCount === 0) {
      this.status.set('Selection has no fillable shapes.');
      return;
    }

    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set(`Filled ${filledCount} shape${filledCount > 1 ? 's' : ''}.`);
  }

  protected updateFillColor(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.fillColor.set(input.value);
  }

  protected connectSelection(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const sceneSelectedObjects = this.getSelectedSceneObjects();
    const selectedObjects = sceneSelectedObjects.length === 2
      ? sceneSelectedObjects
      : this.getSelectedCanvasObjects();
    if (selectedObjects.length !== 2) {
      this.status.set('Select exactly one label and one target object.');
      return;
    }

    const labelObject = selectedObjects.find((object) => object.get('isLabel') === true);
    const targetObject = selectedObjects.find((object) => object.get('isLabel') !== true && !this.isConnectorObject(object));

    if (!labelObject || !targetObject) {
      this.status.set('Connect requires one label and one non-label target.');
      return;
    }

    const labelId = String(labelObject.get('sceneId') ?? '');
    const targetId = String(targetObject.get('sceneId') ?? '');
    if (!labelId || !targetId) {
      this.status.set('Selected objects are missing scene ids.');
      return;
    }

    this.removeConnectorsForLabel(labelId);

    const connector = new fabric.Line([0, 0, 0, 0], {
      stroke: '#203038',
      strokeWidth: 2,
    });

    this.attachMetadata(connector, 'Connector');
    connector.set('isConnector', true);
    connector.set('connectorTargetId', targetId);
    connector.set('connectorLabelId', labelId);

    canvas.add(connector);
    this.syncConnectorPosition(connector);
    canvas.bringObjectToFront(connector);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Connected label to target.');
  }

  protected setActiveTab(tab: PanelTab): void {
    this.activeTab.set(tab);
  }

  protected triggerSceneImport(): void {
    const sceneJson = window.prompt('Paste scene JSON', this.sceneJson());
    if (sceneJson === null) {
      return;
    }

    const trimmedSceneJson = sceneJson.trim();
    if (!trimmedSceneJson) {
      this.status.set('Scene import cancelled.');
      return;
    }

    this.loadSceneFromJson(trimmedSceneJson);
  }

  protected selectSceneItem(item: SceneItem, event: MouseEvent): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const object = this.findCanvasObjectById(item.id);
    if (!object) {
      return;
    }

    if (item.depth > 0) {
      canvas.discardActiveObject();
      canvas.setActiveObject(object);
      canvas.requestRenderAll();
      if (canvas.getActiveObject() === object) {
        this.updateSelectionStatus();
      } else {
        this.selectedSceneIds.set([item.id]);
        this.status.set(`Selected: ${item.label}`);
      }
      return;
    }

    const isAdditiveSelection = event.ctrlKey || event.metaKey;
    if (!isAdditiveSelection) {
      canvas.setActiveObject(object);
      canvas.requestRenderAll();
      if (canvas.getActiveObject() === object) {
        this.updateSelectionStatus();
      } else {
        this.selectedSceneIds.set([item.id]);
        this.status.set(`Selected: ${item.label}`);
      }
      return;
    }

    const selectedIds = new Set(this.selectedSceneIds());
    if (selectedIds.has(item.id)) {
      selectedIds.delete(item.id);
    } else {
      selectedIds.add(item.id);
    }

    const selectedObjects = [...selectedIds]
      .map((sceneId) => this.findCanvasObjectById(sceneId))
      .filter((selectedObject): selectedObject is fabric.FabricObject => !!selectedObject);

    if (selectedObjects.length === 0) {
      canvas.discardActiveObject();
    } else if (selectedObjects.length === 1) {
      canvas.setActiveObject(selectedObjects[0]);
    } else {
      canvas.setActiveObject(new fabric.ActiveSelection(selectedObjects, { canvas }));
    }

    canvas.requestRenderAll();
    this.updateSelectionStatus();
  }

  protected toggleSceneItemVisibility(item: SceneItem, event: Event): void {
    event.stopPropagation();

    if (item.depth !== 0) {
      return;
    }

    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const object = this.findCanvasObjectById(item.id);
    if (!object) {
      return;
    }

    const nextVisible = !object.visible;
    object.set('visible', nextVisible);
    const linkedLabelIds = this.syncConnectedLabelsVisibilityForObject(object, nextVisible);

    if (!nextVisible) {
      const hiddenSceneIds = new Set<string>([
        ...this.collectSceneIds(object),
        ...linkedLabelIds,
      ]);
      const hasHiddenSelection = this.getSelectedCanvasObjects().some((selectedObject) => (
        this.collectSceneIds(selectedObject).some((sceneId) => hiddenSceneIds.has(sceneId))
      ));
      if (hasHiddenSelection) {
        canvas.discardActiveObject();
        this.selectedSceneIds.set([]);
      }
    }

    this.syncConnectorsForObject(object);
    canvas.requestRenderAll();
    this.refreshSceneState();
  }

  protected deleteSceneItem(item: SceneItem, event: Event): void {
    event.stopPropagation();

    if (item.depth !== 0) {
      return;
    }

    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const object = this.findCanvasObjectById(item.id);
    if (!object) {
      return;
    }

    this.deleteObjects([object], `Deleted ${item.label}.`);
  }

  protected renameSceneItem(item: SceneItem, event: Event): void {
    event.stopPropagation();

    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const object = this.findCanvasObjectById(item.id);
    if (!object) {
      return;
    }

    const nextLabel = input.value.trim() || item.label;
    input.value = nextLabel;
    if (object.get('isLabel') === true && object instanceof fabric.IText) {
      object.set('text', nextLabel);
      object.setCoords();
      this.syncConnectorsForObject(object);
      this.canvas?.requestRenderAll();
    }
    object.set('sceneLabel', nextLabel);

    this.refreshSceneState();

    const activeObject = this.canvas?.getActiveObject();
    if (activeObject && String(activeObject.get('sceneId') ?? '') === item.id) {
      this.status.set(`Selected: ${nextLabel}`);
      return;
    }

    this.status.set(`Renamed ${nextLabel}.`);
  }

  protected renameConnectorLabel(labelId: string, event: Event): void {
    event.stopPropagation();

    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const labelObject = this.findCanvasObjectById(labelId);
    if (!(labelObject instanceof fabric.IText) || labelObject.get('isLabel') !== true) {
      return;
    }

    const currentLabel = String(labelObject.text ?? '').trim() || String(labelObject.get('sceneLabel') ?? labelId);
    const nextLabel = input.value.trim() || currentLabel;
    input.value = nextLabel;
    labelObject.set('text', nextLabel);
    labelObject.set('sceneLabel', nextLabel);
    labelObject.setCoords();
    this.syncConnectorsForObject(labelObject);
    this.canvas?.requestRenderAll();

    this.refreshSceneState();
    this.status.set(`Renamed ${nextLabel}.`);
  }

  protected groupSelection(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const activeObject = canvas.getActiveObject();
    if (!(activeObject instanceof fabric.ActiveSelection)) {
      this.status.set('Select multiple objects first.');
      return;
    }

    const groupedObjects = activeObject
      .getObjects()
      .filter((object) => object.get('isLabel') !== true && !this.isConnectorObject(object));
    if (groupedObjects.length < 2) {
      this.status.set('Select at least two non-label objects to group.');
      return;
    }

    canvas.discardActiveObject();
    canvas.remove(...groupedObjects);
    const group = new fabric.Group(groupedObjects);
    this.attachMetadata(group, 'Group');
    group.set('isCustomGroup', true);
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Grouped selection.');
  }

  protected ungroupSelection(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const activeObject = canvas.getActiveObject();
    if (!(activeObject instanceof fabric.Group) || activeObject instanceof fabric.ActiveSelection) {
      this.status.set('Select a group first.');
      return;
    }

    const objects = activeObject.removeAll();
    canvas.remove(activeObject);

    for (const object of objects) {
      object.setCoords();
      canvas.add(object);
      this.syncConnectorsForObject(object);
    }

    if (objects.length > 0) {
      canvas.setActiveObject(objects[0]);
    }

    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set('Ungrouped selection.');
  }

  private initializeScene(): void {
    this.status.set(DEFAULT_STATUS);
  }

  private bindCanvasEvents(canvas: fabric.Canvas): void {
    this.disposers.push(
      canvas.on('object:added', (event) => {
        if (event.target && !this.isConnectorObject(event.target)) {
          this.bringConnectorsToFront();
        }
        this.refreshSceneState();
      }),
      canvas.on('object:modified', () => this.refreshSceneState()),
      canvas.on('object:removed', () => this.refreshSceneState()),
      canvas.on('object:moving', (event) => {
        if (event.target) {
          this.syncConnectorsForObject(event.target);
          canvas.requestRenderAll();
        }
      }),
      canvas.on('object:scaling', (event) => {
        if (event.target) {
          this.syncConnectorsForObject(event.target);
          canvas.requestRenderAll();
        }
      }),
      canvas.on('object:rotating', (event) => {
        if (event.target) {
          this.syncConnectorsForObject(event.target);
          canvas.requestRenderAll();
        }
      }),
      canvas.on('path:created', (event) => {
        if (event.path) {
          this.attachMetadata(event.path, 'Freehand Path');
          canvas.bringObjectToFront(event.path);
          canvas.requestRenderAll();
        }
        this.refreshSceneState();
      }),
      canvas.on('selection:created', () => this.updateSelectionStatus()),
      canvas.on('selection:updated', () => this.updateSelectionStatus()),
      canvas.on('selection:cleared', () => {
        this.selectedSceneIds.set([]);
        this.status.set(this.tool() === 'freehand' ? 'Freehand drawing enabled.' : DEFAULT_STATUS);
      }),
    );
  }

  private applyToolMode(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const isFreehand = this.tool() === 'freehand';
    canvas.isDrawingMode = isFreehand;
    canvas.selection = !isFreehand;
    for (const object of this.collectObjectsPreOrder(canvas.getObjects())) {
      if (object.get('excludeFromExport')) {
        object.selectable = false;
        object.evented = false;
        continue;
      }
      object.selectable = !isFreehand;
      object.evented = !isFreehand;
    }
    canvas.requestRenderAll();
  }

  private attachMetadata(object: fabric.FabricObject, label: string): void {
    object.set('sceneId', this.allocateNextSceneId());
    object.set('sceneLabel', label);
  }

  private ensureSceneMetadata(object: fabric.FabricObject): void {
    const currentSceneId = String(object.get('sceneId') ?? '');
    if (!currentSceneId) {
      object.set('sceneId', this.allocateNextSceneId());
    }

    const currentSceneLabel = String(object.get('sceneLabel') ?? '').trim();
    if (!currentSceneLabel) {
      const fallbackLabel = object.get('isLabel') === true && object instanceof fabric.IText
        ? String(object.text ?? '').trim() || 'Label'
        : String(object.type ?? 'Object');
      object.set('sceneLabel', fallbackLabel);
    }

    if (object instanceof fabric.Group) {
      for (const child of object.getObjects()) {
        this.ensureSceneMetadata(child);
      }
    }
  }

  private refreshSceneState(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const allObjects = canvas.getObjects();
    const objects = allObjects.filter((object) => !object.get('excludeFromExport') && !this.isConnectorObject(object));
    const connectors = this.getConnectors(allObjects);
    const { labelsByTargetId, connectedLabelIds } = this.buildConnectorLabelIndex(connectors);
    const allSceneItems = objects.flatMap((object) => this.toSceneItems(object, 0, labelsByTargetId, connectedLabelIds));
    this.allSceneItems = allSceneItems;
    this.applyHierarchyFilter();
    this.sceneJson.set(JSON.stringify(canvas.toObject(SERIALIZED_PROPERTIES), null, 2));
  }

  private updateSelectionStatus(): void {
    const activeObject = this.canvas?.getActiveObject();
    if (!activeObject) {
      return;
    }
    if (activeObject instanceof fabric.ActiveSelection) {
      this.selectedSceneIds.set(
        activeObject
          .getObjects()
          .map((object) => String(object.get('sceneId') ?? ''))
          .filter((sceneId) => sceneId.length > 0),
      );
      this.status.set(`Selected ${activeObject.size()} objects.`);
      return;
    }
    const sceneId = String(activeObject.get('sceneId') ?? '');
    this.selectedSceneIds.set(sceneId ? [sceneId] : []);
    const label = activeObject.get('sceneLabel') ?? activeObject.type ?? 'Object';
    this.status.set(`Selected: ${String(label)}`);
  }

  private toSceneItems(
    object: fabric.FabricObject,
    depth: number,
    labelsByTargetId: Map<string, Array<{ id: string; label: string }>>,
    connectedLabelIds: Set<string>,
  ): SceneItem[] {
    let sceneId = String(object.get('sceneId') ?? '');
    if (!sceneId) {
      this.ensureSceneMetadata(object);
      sceneId = String(object.get('sceneId') ?? '');
    }
    const isLabel = object.get('isLabel') === true;
    if (isLabel && connectedLabelIds.has(sceneId)) {
      return [];
    }

    const isGroup = object instanceof fabric.Group;
    const displayLabel = object.get('isLabel') === true && object instanceof fabric.IText
      ? String(object.text ?? '').trim() || String(object.get('sceneLabel') ?? object.type ?? 'Object')
      : String(object.get('sceneLabel') ?? object.type ?? 'Object');
    const item: SceneItem = {
      id: sceneId,
      label: displayLabel,
      type: String(object.type ?? 'unknown'),
      depth,
      hasChildren: isGroup && object.getObjects().length > 0,
      visible: object.visible,
      connectorLabels: labelsByTargetId.get(sceneId) ?? [],
    };

    if (!isGroup) {
      return [item];
    }

    return [
      item,
      ...object.getObjects().flatMap((childObject) => (
        this.toSceneItems(childObject, depth + 1, labelsByTargetId, connectedLabelIds)
      )),
    ];
  }

  private loadSceneFromJson(sceneJson: string): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    try {
      const scene = JSON.parse(sceneJson);
      canvas.clear();
      canvas.backgroundColor = '#fbfdff';
      canvas.loadFromJSON(scene, () => {
        this.selectedSceneIds.set([]);
        this.normalizeSceneObjects();
        this.bringConnectorsToFront();
        this.applyToolMode();
        this.refreshSceneState();
        this.status.set('Scene imported.');
      });
    } catch {
      this.status.set('Scene import failed.');
    }
  }

  private reassignSceneIdsFromScratch(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const allObjects = this.collectObjectsPreOrder(canvas.getObjects());
    const oldIdToObjects = new Map<string, fabric.FabricObject[]>();
    for (const object of allObjects) {
      const sceneId = String(object.get('sceneId') ?? '');
      if (!sceneId) {
        continue;
      }
      const objectsForId = oldIdToObjects.get(sceneId) ?? [];
      oldIdToObjects.set(sceneId, [...objectsForId, object]);
    }

    const connectorLinks = new Map<fabric.FabricObject, {
      target?: fabric.FabricObject;
      label?: fabric.FabricObject;
    }>();
    for (const connector of allObjects) {
      if (!this.isConnectorObject(connector)) {
        continue;
      }

      const targetId = String(connector.get('connectorTargetId') ?? '');
      const labelId = String(connector.get('connectorLabelId') ?? '');
      const targetCandidates = oldIdToObjects.get(targetId) ?? [];
      const labelCandidates = oldIdToObjects.get(labelId) ?? [];
      connectorLinks.set(connector, {
        target: this.resolveConnectorLinkedObject(connector, targetCandidates, false),
        label: this.resolveConnectorLinkedObject(connector, labelCandidates, true),
      });
    }

    const objectToNewId = new Map<fabric.FabricObject, string>();
    for (const object of allObjects) {
      const nextSceneId = this.allocateNextSceneId();
      object.set('sceneId', nextSceneId);
      objectToNewId.set(object, nextSceneId);
    }

    for (const [connector, link] of connectorLinks) {
      connector.set('connectorTargetId', link.target ? objectToNewId.get(link.target) ?? '' : '');
      connector.set('connectorLabelId', link.label ? objectToNewId.get(link.label) ?? '' : '');
    }
  }

  private resolveConnectorLinkedObject(
    connector: fabric.FabricObject,
    candidates: fabric.FabricObject[],
    labelSide: boolean,
  ): fabric.FabricObject | undefined {
    if (candidates.length === 0) {
      return undefined;
    }

    const roleFiltered = candidates.filter((candidate) => (
      labelSide
        ? candidate.get('isLabel') === true
        : !this.isConnectorObject(candidate) && candidate.get('isLabel') !== true
    ));
    const resolvedCandidates = roleFiltered.length > 0 ? roleFiltered : candidates;
    if (resolvedCandidates.length === 1) {
      return resolvedCandidates[0];
    }

    if (!(connector instanceof fabric.Line)) {
      return resolvedCandidates[0];
    }

    const endpoint = this.getConnectorEndpoint(connector, labelSide);
    if (!endpoint) {
      return resolvedCandidates[0];
    }

    return resolvedCandidates
      .map((candidate) => ({
        candidate,
        distance: candidate.getCenterPoint().distanceFrom(endpoint),
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
  }

  private getConnectorEndpoint(connector: fabric.Line, labelSide: boolean): fabric.Point | undefined {
    const center = connector.getCenterPoint();
    const endpointX = Number(connector.get(labelSide ? 'x2' : 'x1') ?? Number.NaN);
    const endpointY = Number(connector.get(labelSide ? 'y2' : 'y1') ?? Number.NaN);
    if (!Number.isFinite(endpointX) || !Number.isFinite(endpointY)) {
      return undefined;
    }

    return new fabric.Point(center.x + endpointX, center.y + endpointY);
  }

  private findCanvasObjectById(sceneId: string): fabric.FabricObject | undefined {
    const canvas = this.canvas;
    if (!canvas) {
      return undefined;
    }

    return this.findObjectInCollection(canvas.getObjects(), sceneId);
  }

  private getSelectedCanvasObjects(): fabric.FabricObject[] {
    const activeObject = this.canvas?.getActiveObject();
    if (!activeObject) {
      return [];
    }

    if (activeObject instanceof fabric.ActiveSelection) {
      return activeObject.getObjects().filter((object) => !this.isConnectorObject(object));
    }

    return this.isConnectorObject(activeObject) ? [] : [activeObject];
  }

  private getSelectedSceneObjects(): fabric.FabricObject[] {
    return this.selectedSceneIds()
      .map((sceneId) => this.findCanvasObjectById(sceneId))
      .filter((object): object is fabric.FabricObject => !!object)
      .filter((object) => !this.isConnectorObject(object));
  }

  private deleteSelectedObjects(): number {
    const selectedObjects = this.getSelectedCanvasObjects();
    if (selectedObjects.length === 0) {
      return 0;
    }

    this.deleteObjects(selectedObjects, `Deleted ${selectedObjects.length} object${selectedObjects.length > 1 ? 's' : ''}.`);
    return selectedObjects.length;
  }

  private deleteObjects(objects: fabric.FabricObject[], statusMessage: string): void {
    const canvas = this.canvas;
    if (!canvas || objects.length === 0) {
      return;
    }

    const relatedConnectors = this.findConnectorsForObjects(objects);
    canvas.discardActiveObject();
    this.selectedSceneIds.set([]);

    for (const object of objects) {
      this.removeObjectFromScene(object);
    }

    if (relatedConnectors.length > 0) {
      canvas.remove(...relatedConnectors);
    }

    canvas.requestRenderAll();
    this.refreshSceneState();
    this.status.set(statusMessage);
  }

  private findConnectorsForObjects(objects: fabric.FabricObject[]): fabric.FabricObject[] {
    const connectorSet = new Set<fabric.FabricObject>();

    for (const object of objects) {
      const sceneIds = this.collectSceneIds(object);
      for (const sceneId of sceneIds) {
        const sceneObject = this.findCanvasObjectById(sceneId);
        if (!sceneObject) {
          continue;
        }

        const matchingConnectors = sceneObject.get('isLabel') === true
          ? this.findConnectorsForLabel(sceneId)
          : this.findConnectorsForTarget(sceneId);
        for (const connector of matchingConnectors) {
          connectorSet.add(connector);
        }
      }
    }

    return [...connectorSet];
  }

  private findConnectorsForLabel(labelId: string): fabric.FabricObject[] {
    return this.getConnectors()
      .filter((object) => String(object.get('connectorLabelId') ?? '') === labelId);
  }

  private findConnectorsForTarget(targetId: string): fabric.FabricObject[] {
    return this.getConnectors()
      .filter((object) => String(object.get('connectorTargetId') ?? '') === targetId);
  }

  private removeConnectorsForLabel(labelId: string): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    const connectors = this.findConnectorsForLabel(labelId);

    if (connectors.length > 0) {
      canvas.remove(...connectors);
    }
  }

  private syncConnectedLabelsVisibilityForObject(object: fabric.FabricObject, visible: boolean): string[] {
    const labelIds = new Set<string>();

    for (const sceneId of this.collectSceneIds(object)) {
      const connectors = this.findConnectorsForTarget(sceneId);
      for (const connector of connectors) {
        const labelId = String(connector.get('connectorLabelId') ?? '');
        if (!labelId) {
          continue;
        }
        labelIds.add(labelId);
      }
    }

    for (const labelId of labelIds) {
      const labelObject = this.findCanvasObjectById(labelId);
      if (labelObject) {
        labelObject.set('visible', visible);
      }
    }

    return [...labelIds];
  }

  private syncConnectorsForObject(object: fabric.FabricObject): void {
    if (!this.canvas) {
      return;
    }

    const sceneIds = this.collectSceneIds(object);
    if (sceneIds.length === 0) {
      return;
    }

    const connectors = this.getConnectors().filter((candidate) => (
      sceneIds.some((sceneId) => this.isConnectorForSceneId(candidate, sceneId))
    ));

    for (const connector of connectors) {
      this.syncConnectorPosition(connector);
    }
  }

  private syncAllConnectors(): void {
    if (!this.canvas) {
      return;
    }

    const connectors = this.getConnectors();
    for (const connector of connectors) {
      this.syncConnectorPosition(connector);
    }
  }

  private getConnectors(objects: fabric.FabricObject[] = this.canvas?.getObjects() ?? []): fabric.FabricObject[] {
    return this.collectObjectsPreOrder(objects).filter((object) => this.isConnectorObject(object));
  }

  private bringConnectorsToFront(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    for (const connector of this.getConnectors()) {
      canvas.bringObjectToFront(connector);
    }
  }

  private buildConnectorLabelIndex(connectors: fabric.FabricObject[]): {
    labelsByTargetId: Map<string, Array<{ id: string; label: string }>>;
    connectedLabelIds: Set<string>;
  } {
    const labelsByTargetId = new Map<string, Array<{ id: string; label: string }>>();
    const connectedLabelIds = new Set<string>();

    for (const connector of connectors) {
      const targetId = String(connector.get('connectorTargetId') ?? '');
      const labelId = String(connector.get('connectorLabelId') ?? '');
      if (!targetId || !labelId) {
        continue;
      }

      connectedLabelIds.add(labelId);

      const labelObject = this.findCanvasObjectById(labelId);
      if (!labelObject) {
        continue;
      }

      const labelText = labelObject instanceof fabric.IText
        ? String(labelObject.text ?? '').trim()
        : '';
      const displayLabel = labelText || String(labelObject.get('sceneLabel') ?? labelObject.type ?? labelId);
      const currentLabels = labelsByTargetId.get(targetId) ?? [];
      if (!currentLabels.some((currentLabel) => currentLabel.id === labelId)) {
        labelsByTargetId.set(targetId, [...currentLabels, { id: labelId, label: displayLabel }]);
      }
    }

    return { labelsByTargetId, connectedLabelIds };
  }

  private syncConnectorPosition(connector: fabric.FabricObject): void {
    if (!(connector instanceof fabric.Line)) {
      return;
    }

    const targetId = String(connector.get('connectorTargetId') ?? '');
    const labelId = String(connector.get('connectorLabelId') ?? '');
    const targetObject = this.findCanvasObjectById(targetId);
    const labelObject = this.findCanvasObjectById(labelId);

    if (!targetObject || !labelObject) {
      connector.visible = false;
      return;
    }

    const targetCenter = targetObject.getCenterPoint();
    const labelCenter = labelObject.getCenterPoint();

    connector.set({
      x1: targetCenter.x,
      y1: targetCenter.y,
      x2: labelCenter.x,
      y2: labelCenter.y,
      visible: targetObject.visible && labelObject.visible,
    });
    connector.setCoords();
  }

  private normalizeSceneObjects(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    for (const object of this.collectObjectsPreOrder(canvas.getObjects())) {
      this.ensureSceneMetadata(object);
      if (this.isConnectorObject(object)) {
        object.set('isConnector', true);
      }
    }
  }

  private assignDuplicateMetadata(object: fabric.FabricObject): void {
    const label = String(object.get('sceneLabel') ?? object.type ?? 'Object');
    object.set('sceneId', this.allocateNextSceneId());
    object.set('sceneLabel', `${label} Copy`);

    if (object instanceof fabric.Group) {
      for (const child of object.getObjects()) {
        this.assignDuplicateMetadata(child);
      }
    }
  }

  private fillObjectIfSupported(object: fabric.FabricObject): number {
    if (object instanceof fabric.Group) {
      let filledCount = 0;
      for (const child of object.getObjects()) {
        filledCount += this.fillObjectIfSupported(child);
      }
      return filledCount;
    }

    if (!this.isFillablePrimitive(object)) {
      return 0;
    }

    object.set('fill', this.fillColor());
    return 1;
  }

  private applyHierarchyFilter(): void {
    let filteredItems = this.showHierarchyChildren()
      ? this.allSceneItems
      : this.allSceneItems.filter((item) => item.depth === 0);

    if (this.showLabeledGroupsOnly()) {
      filteredItems = filteredItems.filter((item) => (
        item.hasChildren
        && item.connectorLabels.length > 0
        && item.type.toLowerCase().includes('group')
      ));
    }

    this.sceneItems.set(filteredItems);
  }

  private isFillablePrimitive(object: fabric.FabricObject): boolean {
    return object instanceof fabric.Rect
      || object instanceof fabric.Circle
      || object instanceof fabric.Ellipse
      || object instanceof fabric.Triangle
      || object instanceof fabric.Polygon
      || object instanceof fabric.Path;
  }

  private ensureObjectWithinCanvas(object: fabric.FabricObject, canvas: fabric.Canvas): void {
    const padding = 16;
    const bounds = object.getBoundingRect();
    const maxRight = canvas.getWidth() - padding;
    const maxBottom = canvas.getHeight() - padding;

    let shiftX = 0;
    let shiftY = 0;

    if (bounds.left < padding) {
      shiftX = padding - bounds.left;
    }
    if (bounds.top < padding) {
      shiftY = padding - bounds.top;
    }

    const adjustedRight = bounds.left + bounds.width + shiftX;
    if (adjustedRight > maxRight) {
      shiftX += maxRight - adjustedRight;
    }

    const adjustedBottom = bounds.top + bounds.height + shiftY;
    if (adjustedBottom > maxBottom) {
      shiftY += maxBottom - adjustedBottom;
    }

    if (shiftX !== 0 || shiftY !== 0) {
      object.set({
        left: (object.left ?? 0) + shiftX,
        top: (object.top ?? 0) + shiftY,
      });
      object.setCoords();
    }
  }

  private allocateNextSceneId(): string {
    const canvas = this.canvas;
    const usedSceneIds = new Set<string>();
    if (canvas) {
      for (const object of canvas.getObjects()) {
        for (const sceneId of this.collectSceneIds(object)) {
          usedSceneIds.add(sceneId);
        }
      }
    }

    let nextId = this.createSceneId();
    while (usedSceneIds.has(nextId)) {
      nextId = this.createSceneId();
    }

    return nextId;
  }

  private createSceneId(): string {
    const randomUuid = globalThis.crypto?.randomUUID?.();
    if (randomUuid) {
      return randomUuid;
    }

    this.nextId += 1;
    return `fallback-${Date.now()}-${this.nextId}`;
  }

  private collectObjectsPreOrder(objects: fabric.FabricObject[]): fabric.FabricObject[] {
    const allObjects: fabric.FabricObject[] = [];
    for (const object of objects) {
      allObjects.push(object);
      if (object instanceof fabric.Group) {
        allObjects.push(...this.collectObjectsPreOrder(object.getObjects()));
      }
    }
    return allObjects;
  }

  private collectSceneIds(object: fabric.FabricObject): string[] {
    const sceneIds = new Set<string>();
    this.collectSceneIdsInto(object, sceneIds);
    return [...sceneIds];
  }

  private collectSceneIdsInto(object: fabric.FabricObject, sceneIds: Set<string>): void {
    const sceneId = String(object.get('sceneId') ?? '');
    if (sceneId) {
      sceneIds.add(sceneId);
    }

    if (object instanceof fabric.Group) {
      for (const child of object.getObjects()) {
        this.collectSceneIdsInto(child, sceneIds);
      }
    }
  }

  private findObjectInCollection(objects: fabric.FabricObject[], sceneId: string): fabric.FabricObject | undefined {
    for (const object of objects) {
      if (String(object.get('sceneId') ?? '') === sceneId) {
        return object;
      }

      if (object instanceof fabric.Group) {
        const nestedObject = this.findObjectInCollection(object.getObjects(), sceneId);
        if (nestedObject) {
          return nestedObject;
        }
      }
    }

    return undefined;
  }

  private removeObjectFromScene(object: fabric.FabricObject): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    if (canvas.getObjects().includes(object)) {
      canvas.remove(object);
      return;
    }

    const parentGroup = this.findParentGroupContainingObject(object, canvas.getObjects());
    if (!parentGroup) {
      return;
    }

    parentGroup.remove(object);
    if (parentGroup.size() === 0) {
      canvas.remove(parentGroup);
    }
    parentGroup.setCoords();
  }

  private findParentGroupContainingObject(
    target: fabric.FabricObject,
    objects: fabric.FabricObject[],
  ): fabric.Group | undefined {
    for (const object of objects) {
      if (!(object instanceof fabric.Group)) {
        continue;
      }

      if (object.getObjects().includes(target)) {
        return object;
      }

      const nestedParent = this.findParentGroupContainingObject(target, object.getObjects());
      if (nestedParent) {
        return nestedParent;
      }
    }

    return undefined;
  }

  private isTextInputTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || target.isContentEditable;
  }

  private isConnectorForSceneId(object: fabric.FabricObject, sceneId: string): boolean {
    return this.isConnectorObject(object)
      && (
        String(object.get('connectorTargetId') ?? '') === sceneId
        || String(object.get('connectorLabelId') ?? '') === sceneId
      );
  }

  private isConnectorObject(object: fabric.FabricObject): boolean {
    const isConnector = object.get('isConnector');
    if (isConnector === true) {
      return true;
    }

    if (typeof isConnector === 'string' && isConnector.toLowerCase() === 'true') {
      return true;
    }

    const sceneLabel = String(object.get('sceneLabel') ?? '').trim().toLowerCase();
    if (object instanceof fabric.Line && sceneLabel === 'connector') {
      return true;
    }

    return object instanceof fabric.Line
      && String(object.get('connectorTargetId') ?? '').length > 0
      && String(object.get('connectorLabelId') ?? '').length > 0;
  }
}
