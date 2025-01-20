
export class Room {
    id: number;
    title: string;
    description: string;
    images: string[];
    price: number;

    constructor(obj: Partial<Room>){
        Object.assign(this, obj);
    }
}