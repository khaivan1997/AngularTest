import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'eh-tag',
  standalone: true,
  templateUrl: './eh-tag.html',
  styleUrl: './eh-tag.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EhTag {
  readonly label = input.required<string>();
}
