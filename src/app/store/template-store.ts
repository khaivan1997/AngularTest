/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { computed, Injectable, signal } from '@angular/core';
import { GRID_MAJOR, GRID_MINOR, type TemplatePortMetadata } from '../model/utilities';

export const PREDEFINED_TEMPLATE_IDS = {
  entnahmestelleAmProzessrohr: 'entnahmestelle-am-prozessrohr',
  prozessleitungSchnitt: 'prozessleitung-schnitt',
  behaelterstutzenMitFlansch: 'behaelterstutzen-mit-flansch',
  doppelabsperrventil: 'doppelabsperrventil',
  absperrventilOd12: 'absperrventil-od12',
  absperrventilOd6: 'absperrventil-od6',
  ablassventil: 'ablassventil',
  ventilblockMitPruefanschluss: 'ventilblock-mit-pruefanschluss',
  wassersackrohrUForm: 'wassersackrohr-u-form',
  geradeRohrverschraubung: 'gerade-rohrverschraubung',
  flanschverbindungDn80: 'flanschverbindung-dn80',
  cerabarPmp71b: 'cerabar-pmp71b',
  einschweissSchutzrohr: 'einschweiss-schutzrohr',
  thermometerIthermTm411: 'thermometer-itherm-tm411',
  micropilotFmr62: 'micropilot-fmr62',
} as const;

export type PredefinedTemplateId = typeof PREDEFINED_TEMPLATE_IDS[keyof typeof PREDEFINED_TEMPLATE_IDS];

export interface TemplateMetadata {
  readonly id: PredefinedTemplateId;
  readonly name: string;
  readonly category: string;
  readonly viewBox: string;
  readonly articleNumber?: string;
  readonly description?: string;
  readonly ports: readonly TemplatePortMetadata[];
}

const PREDEFINED_TEMPLATE_METADATA = [
  {
    id: PREDEFINED_TEMPLATE_IDS.entnahmestelleAmProzessrohr,
    name: 'Entnahmestelle am Prozessrohr',
    category: 'Prozessanschluss',
    viewBox: '-8.02 -8.02 22.04 16.04',
    description: 'Entnahmestelle am Prozessrohr',
    ports: [
      {
        id: 'out',
        name: 'Abgang',
        position: { x: 12, y: 0 },
        direction: 0,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.prozessleitungSchnitt,
    name: 'Prozessleitung (Schnitt)',
    category: 'Prozessanschluss',
    viewBox: '-30.74 -6.24 61.48 24.48',
    description: 'Prozessleitung im Schnitt',
    ports: [],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.behaelterstutzenMitFlansch,
    name: 'Behälterstutzen mit Flansch',
    category: 'Prozessanschluss',
    viewBox: '-26.1 -14.1 52.2 20.7',
    description: 'Behälterstutzen mit Flanschanschluss',
    ports: [],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.doppelabsperrventil,
    name: 'Doppelabsperrventil',
    category: 'Armaturen',
    viewBox: '-16.82 -8.82 33.64 15.64',
    articleNumber: 'S004.60.220.13',
    ports: [
      {
        id: 'in',
        name: 'Eingang',
        position: { x: -14, y: 0 },
        direction: 180,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
      {
        id: 'out',
        name: 'Ausgang',
        position: { x: 14, y: 0 },
        direction: 0,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.absperrventilOd12,
    name: 'Absperrventil OD12',
    category: 'Armaturen',
    viewBox: '-9.86 -7.86 19.72 12.72',
    articleNumber: 'AV-OD12-PN400',
    ports: [
      {
        id: 'in',
        name: 'Eingang',
        position: { x: -8, y: 0 },
        direction: 180,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
      {
        id: 'out',
        name: 'Ausgang',
        position: { x: 8, y: 0 },
        direction: 0,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.absperrventilOd6,
    name: 'Absperrventil OD6',
    category: 'Armaturen',
    viewBox: '-9.86 -7.86 19.72 12.72',
    articleNumber: 'AV-OD6-PN400',
    ports: [
      {
        id: 'in',
        name: 'Eingang',
        position: { x: -8, y: 0 },
        direction: 180,
        medium: 'process',
        dn: 6,
        connection: 'Rohr OD6',
      },
      {
        id: 'out',
        name: 'Ausgang',
        position: { x: 8, y: 0 },
        direction: 0,
        medium: 'process',
        dn: 6,
        connection: 'Rohr OD6',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.ablassventil,
    name: 'Ablassventil',
    category: 'Armaturen',
    viewBox: '-9.924 -7.924 20.648 12.848',
    articleNumber: 'ABV-G12',
    ports: [
      {
        id: 'in',
        name: 'Eingang',
        position: { x: -8, y: 0 },
        direction: 180,
        medium: 'process',
        dn: 12,
        connection: 'G½',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.ventilblockMitPruefanschluss,
    name: 'Ventilblock mit Prüfanschluss',
    category: 'Armaturen',
    viewBox: '-7.884 -9.884 20.068 19.768',
    articleNumber: 'VB1-PA-M20',
    ports: [
      {
        id: 'in',
        name: 'Prozessseite',
        position: { x: 0, y: 8 },
        direction: 90,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
      {
        id: 'out',
        name: 'Geräteseite',
        position: { x: 0, y: -8 },
        direction: 270,
        medium: 'process',
        dn: 12,
        connection: 'G½',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.wassersackrohrUForm,
    name: 'Wassersackrohr U-Form',
    category: 'Rohr & Verschraubungen',
    viewBox: '-7.36 -11.86 14.72 19.72',
    articleNumber: 'WSR-U-OD12',
    ports: [
      {
        id: 'in',
        name: 'Prozessseite',
        position: { x: -5, y: -10 },
        direction: 270,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
      {
        id: 'out',
        name: 'Geräteseite',
        position: { x: 5, y: -10 },
        direction: 270,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.geradeRohrverschraubung,
    name: 'Gerade Rohrverschraubung',
    category: 'Rohr & Verschraubungen',
    viewBox: '-6.38 -3.58 12.76 7.16',
    articleNumber: 'RV-G-OD12-S',
    ports: [
      {
        id: 'in',
        name: 'Eingang',
        position: { x: -5, y: 0 },
        direction: 180,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
      {
        id: 'out',
        name: 'Ausgang',
        position: { x: 5, y: 0 },
        direction: 0,
        medium: 'process',
        dn: 12,
        connection: 'Rohr OD12',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.flanschverbindungDn80,
    name: 'Flanschverbindung DN80',
    category: 'Rohr & Verschraubungen',
    viewBox: '-10.44 -5.44 20.88 10.88',
    articleNumber: 'FD-DN80-PN40',
    ports: [],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.cerabarPmp71b,
    name: 'Cerabar PMP71B',
    category: 'Messumformer (E+H)',
    viewBox: '-9.26 -12.26 18.52 25.52',
    articleNumber: 'PMP71B',
    ports: [
      {
        id: 'process',
        name: 'Prozessanschluss',
        position: { x: 0, y: 11 },
        direction: 90,
        medium: 'process',
        dn: 12,
        connection: 'G½',
      },
      {
        id: 'signal',
        name: 'Elektrischer Anschluss',
        position: { x: 0, y: -10 },
        direction: 270,
        medium: 'electrical',
        connection: 'Kabelverschraubung M20',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.einschweissSchutzrohr,
    name: 'Einschweiß-Schutzrohr',
    category: 'Temperatur',
    viewBox: '-6.36 -7.86 12.72 19.72',
    articleNumber: 'SR-ES-14571',
    ports: [],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.thermometerIthermTm411,
    name: 'Thermometer iTHERM TM411',
    category: 'Temperatur',
    viewBox: '-9.26 -23.26 21.52 25.52',
    articleNumber: 'TM411',
    ports: [
      {
        id: 'signal',
        name: 'Elektrischer Anschluss',
        position: { x: 10, y: -16 },
        direction: 0,
        medium: 'electrical',
        connection: 'Kabelverschraubung M20',
      },
    ],
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.micropilotFmr62,
    name: 'Micropilot FMR62',
    category: 'Füllstand',
    viewBox: '-11.78 -21.78 25.56 33.06',
    articleNumber: 'FMR62',
    ports: [
      {
        id: 'signal',
        name: 'Elektrischer Anschluss',
        position: { x: 11, y: -14 },
        direction: 0,
        medium: 'electrical',
        connection: 'Kabelverschraubung M20',
      },
    ],
  },
] as const satisfies readonly TemplateMetadata[];

@Injectable({ providedIn: 'root' })
export class TemplateStore {
  readonly gridMinor = GRID_MINOR;
  readonly gridMajor = GRID_MAJOR;
  private readonly templatesSignal = signal<readonly TemplateMetadata[]>(PREDEFINED_TEMPLATE_METADATA);

  readonly templates = this.templatesSignal.asReadonly();
  readonly templateById = computed<ReadonlyMap<string, TemplateMetadata>>(
    () => new Map<string, TemplateMetadata>(this.templates().map((template) => [template.id, template])),
  );

  getTemplate(id: string) {
    return this.templateById().get(id);
  }

  getHref(id: string) {
    return `#${id}`;
  }
}
