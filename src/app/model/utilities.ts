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

export interface Connection {
  readonly from: Endpoint;
  readonly to: Endpoint;
}
