import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PREDEFINED_TEMPLATE_IDS, TemplateStore } from '../../store/template-store';

@Component({
  selector: 'svg[predefined-svg]',
  standalone: true,
  templateUrl: './predefine-svgs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredefineSvgs {
  private readonly templateStore = inject(TemplateStore);
  protected readonly templateIds = PREDEFINED_TEMPLATE_IDS;

  protected readonly gridMinor = this.templateStore.gridMinor;
  protected readonly gridMajor = this.templateStore.gridMajor;
}
