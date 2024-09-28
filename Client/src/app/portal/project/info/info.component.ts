import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddProjectComponent } from '../add-project/add-project.component';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent {
  constructor(private dialog: MatDialog, 
    public infoDialogRef: MatDialogRef<InfoComponent>
  ) {

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
}
