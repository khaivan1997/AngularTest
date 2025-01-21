import { Component, Signal } from '@angular/core';
import { ContactForm } from '../../shared/models/contact-form.models';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../core/contact.service';
import { StateService } from '../../core/state.service';
import { ServerResponse } from '../../shared/models/server-response.model';

@Component({
  selector: 'app-contact-page',
  imports: [FormsModule],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.css'
})
export class ContactPageComponent {
  constructor(private readonly contactService: ContactService, private readonly stateService: StateService) {
    this.contactFromData = this.stateService.contactDataForm;
    this.responseData = this.stateService.responseData;
  }

  inputWidth = 10;

  contactFromData: Signal<ContactForm>;
  responseData!: Signal<ServerResponse>;

  trySubmit() {
    this.contactService.postMessage(this.contactFromData()).subscribe(res => {
      this.stateService.responseData = res;
    });
  }

  resendNewMsg() {
    this.stateService.responseData = {};
  }

  isReponseEmpty() {
    return Object.keys(this.responseData()).length === 0;
  }
}
