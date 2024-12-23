import { Component } from '@angular/core';
import { InfoComponent } from '../Dialog/info/info.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {

  constructor(private dialog: MatDialog) { }

  logoutModel(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const info = {
          name: 'profile', title: ''
        }
        this.dialog.open(InfoComponent, {
          position: {
            top: `${rect.bottom + window.scrollY + 5}px`, // Positioning below the button
            left: `${rect.left + window.scrollX - 50}px`,
          },
          // width: '100px',
          // height: '80px',
          data: info
        });
  }
}
