import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Room } from '../shared/models/room.model';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  constructor(private readonly http: HttpService) { }

  getRoom(): Observable<Room[]> {
    return this.http.get('rooms').pipe(
      map(rooms => rooms as Room[]) );
  }
}
