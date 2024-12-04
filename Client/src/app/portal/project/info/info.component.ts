import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddProjectComponent } from '../add-project/add-project.component';
import { CommonService } from '../../service/common.service';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent {
  infoObj:any;
  constructor(private dialog: MatDialog, 
    public infoDialogRef: MatDialogRef<InfoComponent>,
    @Inject(MAT_DIALOG_DATA) public info: {name?:string,title?:string},
    private commonServ:CommonService
  ) {
    this.infoObj = info;
  }

  closeInfo() {
    this.infoDialogRef.close();
  }

  AddAnotherProject() {
    this.closeInfo();
    this.dialog.open(AddProjectComponent, {
      height: '90vh',
      width: '40vw',
      disableClose: true
    });
  }

  deleteTarget() {
    this.commonServ.deleteTarget.next(true);
    this.closeInfo();
  }
}
