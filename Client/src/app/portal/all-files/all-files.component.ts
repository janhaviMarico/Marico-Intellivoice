import { Component, TemplateRef } from '@angular/core';
import { AudioService } from '../service/audio.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { CommonService } from '../service/common.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-all-files',
  templateUrl: './all-files.component.html',
  styleUrls: ['./all-files.component.scss']
})
export class AllFilesComponent {
  isAllFiles: boolean = true;
  project: any[] = [];
  isLoading: boolean = false;
  myControl = new FormControl('');
  filteredOptions!: Observable<any[]>;
  existingProject: any[] = [];
  selectedProject: string = '';
  count: number = 0;
  userCode: string = '';

  myUserControl = new FormControl('');
  filteredOptionsUser!: Observable<any[]>;
  existingUser: any = [];
  userRole: string = "";
  tempAudioData: any = [];

  selectedProjects: Map<string, string> = new Map();
  constructor(private audioServ: AudioService, private router: Router, private toastr: ToastrService,
    private commonServ: CommonService, private dialog: MatDialog,
  ) { }

  ngOnInit() {
    this.userRole = localStorage.getItem('role') || '';
    this.userCode = localStorage.getItem('uId') || '';
    if (this.userRole === "1") {
      this.userCode = '';
    }
    const param = {
      user: this.userCode,
      projectName: this.selectedProject,
      isAllFile: 1
    };
    this.getProjectData(param);
    this.getExistingProject();
    this.getExistingUser();
  }

  getExistingProject() {
    let userCode = '';
    userCode = this.userRole === "1" ? '' : this.userCode;
    this.commonServ.getAPI('master/project/all', userCode).subscribe(
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
      this.userCode = localStorage.getItem('uId') || '';
      this.isLoading = false;
    }, (err: any) => {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!')
    });
  }

  changeFileOption(val: number) {
    this.isAllFiles = (val === 1);
    var code = ''
    if (this.isAllFiles) {
      if (this.userRole !== "1") {
        code = localStorage.getItem('uId') || '';
      } else {
        code = ''
      }
    } else {
      code = localStorage.getItem('uId') || '';
    }
    const param = {
      user: code,
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
        user: this.userCode,
        projectName: this.selectedProject
      };
      this.getProjectData(param);
    }
  }

  emptyProject() {
    if (this.myControl.value === "") {
      this.selectedProject = "";
      const param = {
        user: this.userCode,
        projectName: this.selectedProject
      }
      this.getProjectData(param);
    }
  }

  getExistingUser() {
    let userCode = '';
    userCode = this.userRole === "1" ? '' : this.userCode;
    this.commonServ.getAPI('users/all', userCode).subscribe(
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
  deleteConfirm(deleteTemplate: TemplateRef<any>) {
    if (this.selectedProjects.size === 0) {
      this.toastr.warning('No projects selected for deletion');
      return;
    }
    this.dialog.open(deleteTemplate, {
      height: '30vh',
      width: '20vw',
      disableClose: true,
    });
  }

  // Toggle individual row selection
  toggleSelection(TargetId: string, TargetGroup: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedProjects.set(TargetId, TargetGroup);
    } else {
      this.selectedProjects.delete(TargetId);
    }
  }

  // Toggle select all rows
  toggleSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.project.forEach((proj: any) => this.selectedProjects.set(proj.TargetId, proj.TargetGroup));
    } else {
      this.selectedProjects.clear();
    }
  }

  // Delete selected projects
  deleteSelectedProjects(): void {
    this.isLoading = true;
    const targets = Array.from(this.selectedProjects.entries()).map(([TargetId, TargetGroup]) => ({ TGId: TargetId, TGName: TargetGroup }));

    // Call the delete API
    this.audioServ.postAPI('audio/delete', { targets }, false).subscribe(
      (res: any) => {
        this.toastr.success('Selected projects deleted successfully');
        this.getProjectData({ user: this.userCode, projectName: this.selectedProject });
        this.selectedProjects.clear();
        this.isLoading = false;
      },
      (err: any) => {
        this.toastr.error('Failed to delete selected projects');
        this.isLoading = false;
      }
    );
  }

}
