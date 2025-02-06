import { Component } from '@angular/core';
import { AudioService } from '../service/audio.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { CommonService } from '../service/common.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-all-files',
  templateUrl: './all-files.component.html',
  styleUrls: ['./all-files.component.scss']
})
export class AllFilesComponent {
  isAllFiles: boolean = true;
  project: any[] = [];
  userId: string = 'testuser4';
  isLoading: boolean = false;
  myControl = new FormControl('');
  filteredOptions!: Observable<any[]>;
  existingProject: any[] = [];
  selectedProject: string = '';
  count: number = 0;
  userEmail: string = '';

  myUserControl = new FormControl('');
  filteredOptionsUser!: Observable<any[]>;
  existingUser: any = [];
  userRole: string = "";
  tempAudioData: any = [];

  constructor(private audioServ: AudioService, private router: Router, private toastr: ToastrService,
    private commonServ: CommonService
  ) { }

  ngOnInit() {
    this.userRole = localStorage.getItem('role') || '';
    if (this.userRole === "1") {
      this.userEmail = localStorage.getItem('tenetId') || '';
    }
    const param = {
      user: this.userEmail,
      projectName: this.selectedProject,
      isAllFile: 1
    }
    if (!this.selectedProject) { // Ensures API is called only if necessary
      const param = {
        user: this.userEmail,
        projectName: this.selectedProject,
        isAllFile: 1
      };
      this.getProjectData(param);
    }
    this.getExistingProject();
    this.getExistingUser();
  }

  getExistingProject() {
    this.commonServ.getAPI('master/project/all').subscribe(
      (res: any) => {
        this.existingProject = res.data;

        this.filteredOptions = this.myControl.valueChanges.pipe(
          startWith(''),
          map(value => this._filter(value || '')),
        );
      },
      (err: any) => {
        this.toastr.error('Something Went Wrong!');
      }
    );
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.existingProject.filter((option: any) =>
      option.ProjName.toLowerCase().includes(filterValue)
    );
  }

  getProjectData(param: any) {
    this.isLoading = true;
    this.audioServ.postAPI('audio/list', param, false).subscribe((res: any) => {
      this.project = res.data;
      this.tempAudioData = res.data.map((x: any) => Object.assign({}, x));
      this.count = res.count;
      this.isLoading = false;
    }, (err: any) => {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!')
    });
  }

  changeFileOption(val: number) {
    this.isAllFiles = (val === 1);
    var email = ''
    if (this.isAllFiles) {
      if (this.userRole === "1") {
        email = localStorage.getItem('tenetId') || '';
      } else {
        email = ''
      }
    } else {
      email = localStorage.getItem('tenetId') || '';
    }
    const param = {
      user: email,
      projectName: this.selectedProject,
      isAllFile: val
    }
    this.getProjectData(param);
  }

  viewDetails(tgId: string, tgName: string) {
    this.router.navigate(["portal/allFiles/audioDetails/" + tgId + "/" + tgName]);
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    if (event.option.value !== this.selectedProject) {
      this.selectedProject = event.option.value;
      const param = {
        user: this.userEmail,
        projectName: this.selectedProject
      };
      this.getProjectData(param);
    }
  }

  emptyProject() {
    if (this.myControl.value === "") {
      this.selectedProject = "";
      const param = {
        user: this.userEmail,
        projectName: this.selectedProject
      }
      this.getProjectData(param);
    }
  }

  getExistingUser() {
    this.commonServ.getAPI('users/all').subscribe(
      (res: any) => {
        this.existingUser = res;
        this.filteredOptionsUser = this.myUserControl.valueChanges.pipe(
          startWith(''),
          map(value => this._filterUser(value || '')),
        );
      },
      (err: any) => {
        this.toastr.error('Something Went Wrong!');
      }
    );
  }

  onOptionSelectedUser(event: MatAutocompleteSelectedEvent): void {
    const searchUser = event.option.value;
    this.project = searchUser
      ? this.project.filter(project => project.UserName === searchUser)
      : this.project;
  }

  emptyUser() {
    if (this.myUserControl.value === "") {
      this.project = this.tempAudioData;
    }
  }

  private _filterUser(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.existingUser.filter((option: any) =>
      option.userName.toLowerCase().includes(filterValue)
    );
  }

}
