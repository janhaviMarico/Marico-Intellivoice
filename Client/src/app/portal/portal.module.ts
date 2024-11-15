import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PortalRoutingModule } from './portal-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { AllFilesComponent } from './all-files/all-files.component';
import { LayoutComponent } from './layout/layout.component';
import { AudioDetailsComponent } from './audio-details/audio-details.component';
import { AddProjectComponent } from './project/add-project/add-project.component';

import {MatTabsModule} from '@angular/material/tabs';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatAutocompleteModule} from '@angular/material/autocomplete';

import {TableModule} from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';   
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { UploadFileComponent } from './project/upload-file/upload-file.component';
import {MatGridListModule} from '@angular/material/grid-list';
import { SharedModule } from '../shared/shared.module';
import { TooltipDirective } from './tooltip.directive';
import { InfoComponent } from './project/info/info.component' ;
import { AudioService } from './service/audio.service';
import { HttpClientModule } from '@angular/common/http';

import {ToastrModule } from 'ngx-toastr';
import { UserListComponent } from './user-list/user-list.component';

@NgModule({
  declarations: [
    DashboardComponent,
    FeedbackComponent,
    AllFilesComponent,
    LayoutComponent,
    AudioDetailsComponent,
    AddProjectComponent,
    UploadFileComponent,
    TooltipDirective,
    InfoComponent,
    UserListComponent,
  ],
  imports: [
    CommonModule,
    PortalRoutingModule,
    MatTabsModule,
    TableModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatExpansionModule,
    DropdownModule,
    FormsModule,
    MultiSelectModule,
    InputTextModule,
    MatAutocompleteModule,
    TagModule,
    DynamicDialogModule,
    ReactiveFormsModule,
    MatGridListModule,
    SharedModule,
    HttpClientModule,
    MatProgressSpinnerModule,
    ToastrModule.forRoot(),
  ],
  providers: [DialogService, AudioService]
})
export class PortalModule { }
