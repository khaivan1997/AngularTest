import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-entities-view',
  standalone: true,
  templateUrl: './entities-view.html',
  styleUrl: './entities-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntitiesView {}
