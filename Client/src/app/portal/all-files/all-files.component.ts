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
  project:any[] = [];
  userId:string = 'testuser4';
  isLoading: boolean = false;
  myControl = new FormControl('');
  options: string[] = ['One', 'Two', 'Three'];
  filteredOptions!: Observable<any[]>;
  existingProject:any[] = [];
  selectedProject: string = '';
  count:number = 0;
  userEmail:string = '';
  selectedProjects: Map<string, string> = new Map();
  constructor(private audioServ:AudioService,private router:Router, private toastr: ToastrService,
    private commonServ:CommonService, private dialog: MatDialog,
  ) { }

  ngOnInit() {
    const param = {
      user:this.userEmail,
      projectName: this.selectedProject
    }
    this.getProjectData(param);
    this.getExistingProject();
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

  getProjectData(param:any) {
    this.isLoading = true;
    this.audioServ.postAPI('audio/list', param, false).subscribe((res:any)=> {
      this.project = res.data;
      this.count = res.count;
      this.isLoading = false;
    }, (err:any)=> {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!')
    });
  }

  changeFileOption(val:string) {
    this.isAllFiles = (val === 'all');
    if(val === 'all') {
      this.userEmail = ''
    } else {
      this.userEmail = localStorage.getItem('User') || '';
    }
    const param = {
      user:this.userEmail,
      projectName: this.selectedProject
    }
    this.getProjectData(param);
  }

  viewDetails(tgId:string, tgName:string) {
    this.router.navigate(["portal/allFiles/audioDetails/"+tgId+"/"+tgName]);
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedProject = event.option.value;
    const param = {
      user:this.userEmail,
      projectName: this.selectedProject
    }
    this.getProjectData(param);
  }

  emptyProject() {
    if(this.myControl.value === "") {
      this.selectedProject = "";
      const param = {
        user:this.userEmail,
        projectName: this.selectedProject
      }
      this.getProjectData(param);
    }
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
      this.getProjectData({ user: this.userEmail, projectName: this.selectedProject });
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
