import { Injectable, Signal, signal, WritableSignal } from "@angular/core";
import { ContactForm } from "../shared/models/contact-form.models";
import { Room } from "../shared/models/room.model";
import { ServerResponse } from "../shared/models/server-response.model";

@Injectable({
    providedIn: 'root'
})
export class StateService {
    private readonly _responseData: WritableSignal<Partial<ServerResponse>> = signal({});
    private readonly _contactDataForm: WritableSignal<Partial<ContactForm>> = signal({});
    private readonly _rooms: WritableSignal<Partial<Room>[]> = signal([]);

    //get Only
    public get responseData(): Signal<Partial<{statusCode: number; data: any;}>> {
        return this._responseData.asReadonly();
    }

    public get contactDataForm(): Signal<Partial<ContactForm>> {
        return this._contactDataForm.asReadonly();
    }

    public get rooms(): Signal<Partial<Room>[]> {
        return this._rooms.asReadonly();
    }
    //set 
    public set responseData(value: Partial<ServerResponse>) {
        this._responseData.set(value);
    }

    public set contactDataForm(value: Partial<ContactForm>) {
        this._contactDataForm.set(value);

    }

    public set rooms(value: Partial<Room>[]) {
        this._rooms.set(value);
    }

    public printState(){
        console.log(`The current state is:`, this.responseData(), this._contactDataForm(), this._rooms());
    }
}