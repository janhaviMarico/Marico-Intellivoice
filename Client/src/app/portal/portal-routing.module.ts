import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from '../auth/guard/auth.guard';
import { AllFilesComponent } from './all-files/all-files.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { AudioDetailsComponent } from './audio-details/audio-details.component';

const routes: Routes = [
  {
    path:'',
    component:LayoutComponent,
    children: [
      {path:'dashboard',component:DashboardComponent},
      {path:'allFiles',component:AllFilesComponent},
      {path:'feedback',component:FeedbackComponent},
      {path:'allFiles/audioDetails/:tgId/:tgName',component:AudioDetailsComponent},
      {path:'',redirectTo:'/portal/dashboard',pathMatch:'full' },
      // {path:'dashboard',component:DashboardComponent, canActivate: [authGuard]},
      // {path:'allFiles',component:AllFilesComponent, canActivate: [authGuard]},
      // {path:'feedback',component:FeedbackComponent, canActivate: [authGuard]},
      // {path:'allFiles/audioDetails/:tgId/:tgName',component:AudioDetailsComponent, canActivate: [authGuard]},
      // {path:'',redirectTo:'/portal/dashboard',pathMatch:'full' },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortalRoutingModule { }
