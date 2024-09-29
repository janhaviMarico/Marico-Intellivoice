import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  closeDialog : Subject<any> = new Subject<any>();
  constructor(private http:HttpClient) { }
  baseUrl = 'http://localhost:3000/';
  uploadForm(url: string, payload: any): Observable<any> {
      
      return this.http.post(this.baseUrl + url, payload)
  }
}
