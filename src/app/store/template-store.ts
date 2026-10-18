/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { computed, Injectable, signal } from '@angular/core';

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
  readonly articleNumber?: string;
  readonly description?: string;
}

const PREDEFINED_TEMPLATE_METADATA = [
  {
    id: PREDEFINED_TEMPLATE_IDS.entnahmestelleAmProzessrohr,
    name: 'Entnahmestelle am Prozessrohr',
    category: 'Prozessanschluss',
    description: 'Entnahmestelle am Prozessrohr',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.prozessleitungSchnitt,
    name: 'Prozessleitung (Schnitt)',
    category: 'Prozessanschluss',
    description: 'Prozessleitung im Schnitt',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.behaelterstutzenMitFlansch,
    name: 'Behälterstutzen mit Flansch',
    category: 'Prozessanschluss',
    description: 'Behälterstutzen mit Flanschanschluss',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.doppelabsperrventil,
    name: 'Doppelabsperrventil',
    category: 'Armaturen',
    articleNumber: 'S004.60.220.13',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.absperrventilOd12,
    name: 'Absperrventil OD12',
    category: 'Armaturen',
    articleNumber: 'AV-OD12-PN400',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.absperrventilOd6,
    name: 'Absperrventil OD6',
    category: 'Armaturen',
    articleNumber: 'AV-OD6-PN400',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.ablassventil,
    name: 'Ablassventil',
    category: 'Armaturen',
    articleNumber: 'ABV-G12',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.ventilblockMitPruefanschluss,
    name: 'Ventilblock mit Prüfanschluss',
    category: 'Armaturen',
    articleNumber: 'VB1-PA-M20',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.wassersackrohrUForm,
    name: 'Wassersackrohr U-Form',
    category: 'Rohr & Verschraubungen',
    articleNumber: 'WSR-U-OD12',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.geradeRohrverschraubung,
    name: 'Gerade Rohrverschraubung',
    category: 'Rohr & Verschraubungen',
    articleNumber: 'RV-G-OD12-S',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.flanschverbindungDn80,
    name: 'Flanschverbindung DN80',
    category: 'Rohr & Verschraubungen',
    articleNumber: 'FD-DN80-PN40',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.cerabarPmp71b,
    name: 'Cerabar PMP71B',
    category: 'Messumformer (E+H)',
    articleNumber: 'PMP71B',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.einschweissSchutzrohr,
    name: 'Einschweiß-Schutzrohr',
    category: 'Temperatur',
    articleNumber: 'SR-ES-14571',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.thermometerIthermTm411,
    name: 'Thermometer iTHERM TM411',
    category: 'Temperatur',
    articleNumber: 'TM411',
  },
  {
    id: PREDEFINED_TEMPLATE_IDS.micropilotFmr62,
    name: 'Micropilot FMR62',
    category: 'Füllstand',
    articleNumber: 'FMR62',
  },
] as const satisfies readonly TemplateMetadata[];

@Injectable({ providedIn: 'root' })
export class TemplateStore {
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
