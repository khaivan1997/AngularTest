export type TemplatePortMedium = 'process' | 'electrical';

export interface TemplatePortMetadata {
  readonly id: string;
  readonly name?: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly direction: number;
  readonly medium: TemplatePortMedium;
  readonly dn?: number;
  readonly connection?: string;
}

export interface Endpoint {
  readonly objectId: string;
  readonly portId: string;
}

export interface ConnectionControlPoints {
  readonly pos1X: number;
  readonly pos1Y: number;
  readonly pos2X: number;
  readonly pos2Y: number;
}

export interface Connection {
  readonly from: Endpoint;
  readonly to: Endpoint;
}

export interface ConnectionExport {
  readonly connection: Connection;
  readonly controlPoints: ConnectionControlPoints;
}

export interface DrawingItemExport {
  readonly itemId: string;
  readonly templateRefId: string;
  readonly transform: {
    readonly position: {
      readonly x: number;
      readonly y: number;
    };
    readonly rotate: number;
  };
}

export interface DrawingConnectionExport extends ConnectionExport {
  readonly connectionId: string;
}

export interface DrawingExportObject {
  readonly items: readonly DrawingItemExport[];
  readonly connections: readonly DrawingConnectionExport[];
}

export const GRID_MINOR = {
  tileWidth: 10,
  tileHeight: 10,
} as const;

export const GRID_MAJOR = {
  tileWidth: 20,
  tileHeight: 20,
} as const;
