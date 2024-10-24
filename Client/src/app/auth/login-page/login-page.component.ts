import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  constructor(private  msalService: MsalService,private router:Router,private toastr: ToastrService) { }

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

      localStorage.setItem('LoginTime',new Date().getTime().toString())
      this.router.navigate(['/portal/dashboard'])
    }, (error) => {
      this.toastr.error('Something Went Wrong!')
    });
  }
}
