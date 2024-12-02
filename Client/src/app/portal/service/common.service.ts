import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  deleteTarget: Subject<any> = new Subject<boolean>();
  constructor(private http: HttpClient) { }
  baseUrl = environment.BASE_URL;
  compareObj: any;

  postAPI(url: string, payload: any): Observable<any> {
    return this.http.post(this.baseUrl + url, payload);
  }

  getAPI(url: string): Observable<any> {
    return this.http.get(this.baseUrl + url);
  }

  getParamAPI(url: string, isProject: boolean, projTgArr: any[]) {
    var params;
    if (isProject) {
      params = new HttpParams().set('project_1', projTgArr[0].projectName)
        .set('project_2', projTgArr[1].projectName).set('compare', 'PROJ');
    } else {
      params = new HttpParams().set('project_1', projTgArr[0].targetName)
        .set('project_2', projTgArr[1].targetName).set('compare', 'TARGET');
    }

    return this.http.get(this.baseUrl + url, {
      params: params
    });
  }

  getCompareObj(): any {
    return this.compareObj;
  }
  setCompareObj(value: any) {
    this.compareObj = value;
  }
}
