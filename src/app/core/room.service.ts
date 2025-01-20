import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Room } from '../shared/models/room.model';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  constructor(private http: HttpService) { }

  getRoom() {
    return this.http.get('rooms').pipe(
      map(rooms => {
        if (rooms instanceof Array) {
          return rooms.map(room => new Room(room));
        } 
        return [];
      })
    );
  }
}
