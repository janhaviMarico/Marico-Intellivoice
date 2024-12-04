import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from '../auth/guard/auth.guard';
import { AllFilesComponent } from './all-files/all-files.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { AudioDetailsComponent } from './audio-details/audio-details.component';
import { UserListComponent } from './user-list/user-list.component';
import { CompareComponent } from './compare/compare.component';
import { CompareDetailComponent } from './compare/compare-detail/compare-detail.component';
import { AudioProcessComponent } from './audio-process/audio-process.component';

const routes: Routes = [
  {
    path:'',
    component:LayoutComponent,
    children: [
      {path:'dashboard',component:DashboardComponent, canActivate: [authGuard]},
      {path:'allFiles',component:AllFilesComponent, canActivate: [authGuard]},
      {path:'feedback',component:FeedbackComponent, canActivate: [authGuard]},
      {path:'allFiles/audioDetails/:tgId/:tgName',component:AudioDetailsComponent, canActivate: [authGuard]},
      {path:'userList',component:UserListComponent, canActivate: [authGuard]},
      {path:'comparison',component:CompareComponent, canActivate: [authGuard]},
      {path:'comparison/comparison-detail',component:CompareDetailComponent, canActivate: [authGuard]},
      {path:'dashboard/audio-process',component:AudioProcessComponent, canActivate: [authGuard]},
      {path:'',redirectTo:'/portal/dashboard',pathMatch:'full' },
      // {path:'dashboard',component:DashboardComponent},
      // {path:'allFiles',component:AllFilesComponent},
      // {path:'feedback',component:FeedbackComponent},
      // {path:'allFiles/audioDetails/:tgId/:tgName',component:AudioDetailsComponent},
      // {path:'userList',component:UserListComponent},
      // {path:'comparison',component:CompareComponent},
      // {path:'comparison/comparison-detail',component:CompareDetailComponent},
      // {path:'dashboard/audio-process',component:AudioProcessComponent},
      // {path:'',redirectTo:'/portal/dashboard',pathMatch:'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortalRoutingModule { }
