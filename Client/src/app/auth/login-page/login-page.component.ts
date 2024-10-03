import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  constructor(private  msalService: MsalService,private router:Router) {

  }

  ngOnInit() {
    this.msalService.instance.handleRedirectPromise().then((res:any)=> {
      if(res!=null && res.account != null) {
        this.msalService.instance.setActiveAccount(res.account);
      }
    })
  }

  isLoggedIn():boolean {
    return this.msalService.instance.getActiveAccount() != null;
  }
  
  async login() {
    await this.msalService.instance.initialize();

    this.msalService.loginPopup().subscribe((res: AuthenticationResult) => {
      localStorage.setItem('User',res.account.username);
      this.msalService.instance.setActiveAccount(res.account);
      this.router.navigate(['/portal/dashboard'])
    }, (error) => {
      console.log('Login error:', error);
    });
  }
}
