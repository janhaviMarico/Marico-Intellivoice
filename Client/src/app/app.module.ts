import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';
import { MSAL_INSTANCE, MsalModule, MsalService } from '@azure/msal-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth:{
      clientId: '76227ae6-b2f6-4325-a751-a5b6f94fb870',
      redirectUri: 'http://localhost:4200'
    }
  })
}

export function initializeMsal(msalService: MsalService): () => Promise<void> {
  return () => msalService.instance.initialize();
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MsalModule,
    BrowserAnimationsModule
  ],
  providers: [
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    MsalService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeMsal,
      deps: [MsalService],
      multi: true
    },
    provideToastr()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
