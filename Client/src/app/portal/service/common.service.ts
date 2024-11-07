import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor(private http: HttpClient) { }
  baseUrl = environment.BASE_URL;

  postAPI(url: string, payload: any): Observable<any> {
    return this.http.post(this.baseUrl + url, payload);
  }

  getAPI(url:string): Observable<any> {
    return this.http.get(this.baseUrl + url);
  }
}
