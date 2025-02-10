import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, of, startWith } from 'rxjs';
import { CommonService } from '../service/common.service';
import { AudioService } from '../service/audio.service';
import { Router } from '@angular/router';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss'],
})
export class CompareComponent implements OnInit {
  isProjectCompare: boolean = true;
  projectForm: FormGroup;
  targetForm: FormGroup;
  target: any;
  selectedProject: string = '';

  existingProject: any[] = [];
  filteredProject!: Observable<any[]>;
  filteredProjectsArray: Observable<any[]>[] = [];
  existingTGs: any[] = [];
  filteredTGsArray: Observable<any[]>[] = [];
  userCode: string = '';
  userRole: string = "";

  constructor(private fb: FormBuilder, private toastr: ToastrService, private commonServ: CommonService,
    private audioServ: AudioService, private router: Router) {
      this.userRole = localStorage.getItem('role') || '';
      this.userCode = localStorage.getItem('uId') || '';
    this.projectForm = this.fb.group({
      projects: this.fb.array([]),
    });

    this.targetForm = this.fb.group({
      targets: this.fb.array([]),
      project: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
    this.addProject();
    this.addProject();
    this.addTargetGrp();
    this.addTargetGrp();
    this.getExistingProject();
  }

  getExistingProject() {
    let userCode = '';
    userCode = this.userRole === "1" ? '' : this.userCode;
    this.commonServ.getAPI('master/project/all', userCode).subscribe(
      (res: any) => {
        this.existingProject = res.data;
        this.projectFilterDropdown();
      },
      (err: any) => {
        this.toastr.error('Something Went Wrong!');
      }
    );
  }
  projectFilterDropdown() {
    const projectControl = this.targetForm.get('project');
    if (projectControl) {
      this.filteredProject = projectControl.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value || '')),
      );
    } else {
      this.filteredProject = of([]);
    }

    this.projects.controls.forEach((control, index) => {
      this.setupAutocomplete(index);
    });
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.existingProject.filter((option: any) =>
      option.ProjName.toLowerCase().includes(filterValue)
    );
  }

  changeOption(isCompProj: boolean) {
    if(isCompProj) {
      this.projectForm.reset();
    } else {
      this.targetForm.reset();
    }
    this.isProjectCompare = isCompProj;
  }

  get projects(): FormArray {
    return this.projectForm.get('projects') as FormArray;
  }

  addProject(): void {
    if (this.projects.length < 2) {
      const projectGroup = this.fb.group({
        projectName: ['', Validators.required]
      });
      this.projects.push(projectGroup);

      this.setupAutocomplete(this.projects.length - 1);
    } else {
      this.toastr.warning('Maximum 2 project limit for comparison!');
    }
  }

  setupAutocomplete(index: number) {
    const control = this.projects.at(index).get('projectName');
    if (control) {
      this.filteredProjectsArray[index] = control.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value || ''))
      );
    }
  }

  removeProject(index: number): void {
    if (this.projects.length === 2) {
      this.toastr.warning('Minimum 2 Projects required for Comparison!');
    } else {
      this.projects.removeAt(index);
      this.filteredProjectsArray.splice(index, 1);
    }
  }

  onSubmitProject() {
    let areUnique: boolean = this.projectForm.value.projects.every(
      (item:any, index:number) =>
        this.projectForm.value.projects.findIndex((obj:any) => obj.projectName === item.projectName) === index
    );

    if(areUnique) {
      const param = {
        arr: this.projectForm.value.projects,
        isProject: true
      }
      this.commonServ.setCompareObj(param);
      this.router.navigate(['/portal/comparison/comparison-detail']);
    } else {
      this.toastr.warning('Select Unique Projects for Comparison');
    }
    
  }

  get targets(): FormArray {
    return this.targetForm.get('targets') as FormArray;
  }

  addTargetGrp(): void {
    if (this.targets.length < 2) {
      const targetGroup = this.fb.group({
        targetName: ['', Validators.required]
      });
      this.targets.push(targetGroup);
    } else {
      this.toastr.warning('Maximum 2 Target limit for comparison!')
    }
  }

  removeTargetGrp(index: number): void {
    if (this.targets.length === 2) {
      this.toastr.warning('Minimum 2 Target required for Comparison!')
    } else {
      this.targets.removeAt(index);
    }
  }

  onSubmitTarget() {
    let areUnique: boolean = this.targetForm.value.targets.every(
      (item:any, index:number) =>
        this.targetForm.value.targets.findIndex((obj:any) => obj.targetName === item.targetName) === index
    );
    if(areUnique) {
      const param = {
        arr: this.targetForm.value.targets,
        isProject: false
      }
      this.commonServ.setCompareObj(param);
      this.router.navigate(['/portal/comparison/comparison-detail']);
    } else {
      this.toastr.warning('Select Unique Target Groups for Comparison')
    }
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedProject = event.option.value;
    this.existingTGs = [];
    this.targets.clear();
    this.addTargetGrp();
    this.addTargetGrp();
    // this.targets.push(this.fb.control(''));
    // this.targets.push(this.fb.control(''));
    const foundProject = this.existingProject.find((project) => project.ProjName.trim() === this.selectedProject.trim());
    if (foundProject) {
      this.existingTGs = foundProject.targetDetails;
    }
    this.targets.controls.forEach((control, index) => {
      this.setupAutocompleteTG(index);
    });
  }

  setupAutocompleteTG(index: number) {
    const control = this.targets.at(index).get('targetName');
    if (control) {
      this.filteredTGsArray[index] = control.valueChanges.pipe(
        startWith(''),
        map(value => this._filterTG(value || ''))
      );
    }
  }

  private _filterTG(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.existingTGs.filter((option: any) =>
      option.TGName.toLowerCase().includes(filterValue)
    );
  }

  mouseEnterOnTargetGrp(tg: any) {
    this.target = tg;
  }
}
