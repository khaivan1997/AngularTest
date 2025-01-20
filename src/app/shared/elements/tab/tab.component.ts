import { Component, Input } from '@angular/core';

@Component({
  selector: 'tab',
  imports: [],
  templateUrl: './tab.component.html',
  styleUrl: './tab.component.css'
})
export class TabComponent {
  @Input('tabTitle') title: string;
  @Input() active = false;
}
