import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CommonService } from '../../service/common.service';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent {
  infoObj:any;
  baseHref:string = '../../../../';
  constructor(private dialog: MatDialog, 
    public infoDialogRef: MatDialogRef<InfoComponent>,
    @Inject(MAT_DIALOG_DATA) public info: {name?:string,title?:string},
    private commonServ:CommonService, private msalService:MsalService
  ) {
    this.infoObj = info;
    if(window.location.origin.includes('ai.maricoapps.biz')) {
      this.baseHref = 'Insightopedia/'
    }
  }

  closeInfo() {
    this.infoDialogRef.close();
  }

  AddAnotherProject() {
    this.closeInfo();
  }

  deleteTarget() {
    this.commonServ.deleteTarget.next(true);
    this.closeInfo();
  }

  logout() {
    this.msalService.logout();
    localStorage.removeItem('User');
  }
}
