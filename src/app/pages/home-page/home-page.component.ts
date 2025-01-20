import { NgFor } from '@angular/common';
import { Component, Signal } from '@angular/core';
import { Room } from '../../shared/models/room.model';
import { StateService } from '../../core/state.service';
import { environment } from '../../../environments/environment';
import { RoomService } from '../../core/room.service';
import { RoomPricePipe } from "../../shared/pipes/room-price.pipe";

@Component({
  selector: 'app-home-page',
  imports: [NgFor, RoomPricePipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
  constructor(private readonly stateService: StateService, private readonly roomService: RoomService) {
    this.rooms = this.stateService.rooms;
  }
  rooms: Signal<Partial<Room>[]>;

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.roomService.getRoom().subscribe(res => {
      this.stateService.rooms = res;
    })
  }

  getImageUrl(imgName: string) {
    return `${environment.apiUrl}/${imgName}`;
  }
}
