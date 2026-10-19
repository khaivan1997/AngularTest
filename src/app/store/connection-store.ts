/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {computed, Injectable, signal, type ComponentRef} from '@angular/core';
import type {Connector} from '../components/connector/connector';
import type {Connection, DrawingConnectionExport} from '../model/utilities';

interface RenderedConnection {
  readonly connectionObj: Connection;
  readonly componentRef: ComponentRef<Connector>;
}

@Injectable({providedIn: 'root'})
export class ConnectionStore {
  private readonly renderedConnections = signal<ReadonlyMap<string, RenderedConnection>>(new Map());
  readonly connections = computed(() => this.renderedConnections().values());
  readonly connectionEntries = computed(() => this.renderedConnections().entries());
  readonly signalSelectedConnections = signal<Set<ComponentRef<Connector>>>(new Set());

  register(
    connectionObj: Connection,
    componentRef: ComponentRef<Connector>,
  ) {
    const connectionId = componentRef.instance.connectionId();
    const existingConnection = this.renderedConnections().get(connectionId);

    if (existingConnection && existingConnection.componentRef !== componentRef) {
      this.destroy(connectionId);
    }

    this.renderedConnections.update((connections) => {
      const nextConnections = new Map(connections);
      nextConnections.set(connectionId, {connectionObj, componentRef});
      return nextConnections;
    });
  }

  setSelect(componentRef: ComponentRef<Connector>, selected = true) {
    this.signalSelectedConnections.update((connections) => {
      const nextConnections = new Set(connections);

      if (selected) {
        nextConnections.add(componentRef);
      } else {
        nextConnections.delete(componentRef);
      }

      return nextConnections;
    });
  }

  getEntity(connectionId: string) {
    return this.renderedConnections().get(connectionId);
  }

  getExportObject(): readonly DrawingConnectionExport[] {
    return [...this.renderedConnections()].map(([connectionId, {connectionObj}]) => ({
      connectionId,
      connection: {
        from: {...connectionObj.from},
        to: {...connectionObj.to},
      },
    }));
  }

  deleteSelected() {
    const selectedConnections = this.signalSelectedConnections();

    for (const [connectionId, renderedConnection] of this.renderedConnections()) {
      if (selectedConnections.has(renderedConnection.componentRef)) {
        this.destroy(connectionId);
      }
    }
  }

  destroyForEntity(objectId: string) {
    for (const [connectionId, renderedConnection] of this.renderedConnections()) {
      const {from, to} = renderedConnection.connectionObj;

      if (from.objectId === objectId || to.objectId === objectId) {
        this.destroy(connectionId);
      }
    }
  }

  destroy(connectionId: string) {
    const renderedConnection = this.renderedConnections().get(connectionId);

    if (!renderedConnection) {
      return;
    }

    this.renderedConnections.update((connections) => {
      const nextConnections = new Map(connections);
      nextConnections.delete(connectionId);
      return nextConnections;
    });
    this.setSelect(renderedConnection.componentRef, false);
    renderedConnection.componentRef.destroy();
  }
}
