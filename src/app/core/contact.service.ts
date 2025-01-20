import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { ContactForm } from '../shared/models/contact-form.models';

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  constructor(private http: HttpService) { }

  postMessage(contactFromData: ContactForm | Partial<ContactForm>) {
    return this.http.post('contact-form', contactFromData);
  }
}
