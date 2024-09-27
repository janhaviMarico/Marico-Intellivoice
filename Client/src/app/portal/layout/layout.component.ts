import { Component } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {

  constructor(private msalService:MsalService) { }

  logout() {
    this.msalService.logout();
  }
}
