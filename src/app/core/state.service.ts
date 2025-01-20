import { Injectable, Signal, signal, WritableSignal } from "@angular/core";
import { ContactForm } from "../shared/models/contact-form.models";
import { Room } from "../shared/models/room.model";
import { ServerResponse } from "../shared/models/server-response.model";

@Injectable({
    providedIn: 'root'
})
export class StateService {
    private readonly _responseData: WritableSignal<ServerResponse> = signal({});
    private readonly _contactDataForm: WritableSignal<ContactForm> = signal({});
    private readonly _rooms: WritableSignal<Room[]> = signal([]);

    //get Only
    public get responseData(): Signal<ServerResponse> {
        return this._responseData.asReadonly();
    }

    public get contactDataForm(): Signal<ContactForm> {
        return this._contactDataForm.asReadonly();
    }

    public get rooms(): Signal<Room[]> {
        return this._rooms.asReadonly();
    }
    //set 
    public set responseData(value: ServerResponse) {
        this._responseData.set(value);
    }

    public set contactDataForm(value: ContactForm) {
        this._contactDataForm.set(value);

    }

    public set rooms(value: Room[]) {
        this._rooms.set(value);
    }

    public printState(){
        console.log(`The current state is:`, this.responseData(), this._contactDataForm(), this._rooms());
    }
}