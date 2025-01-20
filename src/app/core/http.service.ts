import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { catchError, map, of } from 'rxjs';
import { AjaxResponse } from 'rxjs/ajax';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  constructor(private http: HttpClient) { }

  get<T>(path: string) {
    return this.http.get(`${environment.apiUrl}/${path}`);
  }

  post<T>(path: string, body: any, options = {}) {
    return this.http.post(`${environment.apiUrl}/${path}`, body, {
      observe: 'response',
      ...options
    }).pipe(
      map(res => {
        return {
          statusCode: res.status,
          data: res.body
        }
      }),
      catchError(err => {
        return of({
          statusCode: err.status,
          data: err.error
        });
      })
    )
  }
}
