import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { ContactForm } from '../shared/models/contact-form.models';
import { Observable } from 'rxjs';
import { ServerResponse } from '../shared/models/server-response.model';

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  constructor(private readonly http: HttpService) { }

  postMessage(contactFromData: ContactForm): Observable<ServerResponse> {
    return this.http.post('contact-form', contactFromData);
  }
}
