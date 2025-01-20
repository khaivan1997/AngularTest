import { Component, effect, ViewChild } from '@angular/core';
import { NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { HorizontalTabbarComponent } from "./shared/elements/horizontal-tabbar/horizontal-tabbar.component";
import { TabComponent } from "./shared/elements/tab/tab.component";
import { HomePageComponent } from "./pages/home-page/home-page.component";
import { ContactPageComponent } from "./pages/contact-page/contact-page.component";
import { filter } from 'rxjs';
import { StateService } from './core/state.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, HorizontalTabbarComponent, TabComponent, HomePageComponent, ContactPageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Hotel';
  @ViewChild('tabbar') tabBar: HorizontalTabbarComponent;

  currentUrl: string;
  constructor(private readonly router: Router, private readonly stateService: StateService){
    this.router.events.pipe(
      filter(ev => ev instanceof NavigationStart)
    ).subscribe( v => this.currentUrl = v.url);

    effect(() => {
      this.stateService.printState();
    });
  }
}
