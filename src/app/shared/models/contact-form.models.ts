export class ContactForm {
    name: string;
    message: string;

    constructor(obj: Partial<ContactForm>) {
        Object.assign(this, obj);
    }
}