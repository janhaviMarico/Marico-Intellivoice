import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from 'src/app/portal/service/common.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  userDetails:any;
  user:any;
  constructor(readonly msalService: MsalService,readonly router:Router,readonly toastr: ToastrService,
    readonly commonServ:CommonService
  ) { }

  ngOnInit() {
    this.msalService.instance.handleRedirectPromise().then((res:any)=> {
      if(res?.account) {
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
      this.userDetails = res;
      this.addUserDetails()
      localStorage.setItem('LoginTime',new Date().getTime().toString())
      this.router.navigate(['/portal/dashboard'])
    }, (err) => {
      this.toastr.error('Something Went Wrong!')
    });
  }

  addUserDetails() {
    const payload = {
      "userid": this.userDetails.account.tenantId,
      "userName": this.userDetails.account.name,
      "email": this.userDetails.account.username,
      "access": "read",
      "rolecode": 3
    }
    this.commonServ.postAPI('users/create',payload).subscribe((res:any)=> {
      if(res.response === 200) {
        this.user = res.user;
      }
    },(err)=> {
      this.toastr.error('Something Went Wrong!');
    })
  }
}
