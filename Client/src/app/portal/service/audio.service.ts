import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import {environment} from '../../../environments/environment'
@Injectable({
  providedIn: 'root'
})
export class AudioService {

  closeDialog : Subject<any> = new Subject<any>();
  constructor(private http:HttpClient) { }
  //baseUrl = 'http://localhost:3000/';
  baseUrl = environment.BASE_URL;
  uploadForm(url: string, payload: any): Observable<any> {
      return this.http.post(this.baseUrl + url, payload)
  }
  getData(url: string, userId: string) {
    const params = new HttpParams().set('userid', userId)
    return this.http.get(this.baseUrl + url, { params: params});
  }

  getDetails(url: string, tgId: string, tgName:string) {
    const params = new HttpParams().set('tgId', tgId).set('tgName',tgName)
    return this.http.get(this.baseUrl + url, { params: params});
  }
}
