export class ServerResponse {
    statusCode: number;
    data: any

    constructor(obj: Partial<Response>){
        Object.assign(this, obj);
    }
}