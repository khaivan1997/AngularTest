import { NgFor } from '@angular/common';
import { Component, ContentChildren, Input, QueryList } from '@angular/core';
import { TabComponent } from '../tab/tab.component';

@Component({
  selector: 'horizontal-tabbar',
  imports: [NgFor],
  templateUrl: './horizontal-tabbar.component.html',
  styleUrl: './horizontal-tabbar.component.css'
})
export class HorizontalTabbarComponent {
  @ContentChildren(TabComponent) tabs: QueryList<TabComponent>;

  ngAfterContentInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    console.log('tab bar', this.tabs);
    if (this.tabs.length > 0) {
      this.selectTab(this.tabs.first);
    }
  }

  selectTab(tab: TabComponent) {
    this.tabs.toArray().forEach(tab => tab.active = false);
  
  // activate the tab the user has clicked on.
  tab.active = true;
  }

  selectTabByTitle(title: string) {

  }
}
