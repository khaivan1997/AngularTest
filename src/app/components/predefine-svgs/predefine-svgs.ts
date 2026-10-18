import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PREDEFINED_TEMPLATE_IDS } from '../../store/template-store';

@Component({
  selector: 'svg[predefined-svg]',
  standalone: true,
  templateUrl: './predefine-svgs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredefineSvgs {
  protected readonly templateIds = PREDEFINED_TEMPLATE_IDS;

  protected readonly gridMinor = {
    tileWidth: 10,
    tileHeight: 10,
  } as const;

  protected readonly gridMajor = {
    tileWidth: 20,
    tileHeight: 20,
  } as const;
}
