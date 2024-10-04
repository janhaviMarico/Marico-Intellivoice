import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

export const authGuard: CanActivateFn = (route, state) => {
  const msalService = inject(MsalService);
  const router = inject(Router);
  if(msalService.instance.getActiveAccount() == null) {
    router.navigate(["/login"]);
    return false;
  }

  // Check session expiry
  const loginTime = localStorage.getItem('LoginTime');
  if (loginTime) {
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - Number(loginTime);
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

    // If session is older than 24 hours, force logout and redirect to login
    if (timeDifference > oneDayInMilliseconds) {
      msalService.logout(); // Optional: You can also clear localStorage here
      router.navigate(["/login"]);
      return false;
    }
  } else {
    // If no login time is found, redirect to login
    router.navigate(["/login"]);
    return false;
  }
  
  return true;
};
