import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, startWith } from 'rxjs';
import { CommonService } from '../service/common.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss'],
})
export class CompareComponent implements OnInit {
  isProjectCompare: boolean = true;
  projectForm: FormGroup;
  targetForm: FormGroup;

  existingProject: any[] = [];
  filteredProject!: Observable<any[]>;
  myControl = new FormControl('');

  constructor(private fb: FormBuilder,private toastr: ToastrService, private commonServ: CommonService) {

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
    this.addProject(); // Add an initial project
    this.addTargetGrp();
    this.addTargetGrp();
    this.getExistingProject();
  }

  getExistingProject() {
    this.commonServ.getAPI('master/project/all').subscribe((res:any)=> {
      this.existingProject = res.data;
      this.filteredProject = this.myControl.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value || '')),
      );
    },(err:any)=>{
      this.toastr.error('Something Went Wrong!')
    })
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.existingProject.filter((option:any) => option.ProjName.toLowerCase().includes(filterValue));
  }

  changeOption(isCompProj:boolean) {
    this.isProjectCompare =isCompProj;
  }

  get projects(): FormArray {
    return this.projectForm.get('projects') as FormArray;
  }

  addProject(): void {
    if(this.projects.length < 5) {
      const projectGroup = this.fb.group({
        projectName: ['', Validators.required]
      });
      this.projects.push(projectGroup); // Use the getter to access the FormArray
    } else {
      this.toastr.warning('Maximum 5 project limit for comparison!')
    }
  }

  removeProject(index: number): void {
    if(this.projects.length === 2) {
      this.toastr.warning('Minimum 2 Project required for Comparison!')
    } else {
      this.projects.removeAt(index);
    }
  }

  onSubmitProject(): void {
    console.log(this.projectForm.value);
  }

  get targets(): FormArray {
    return this.targetForm.get('targets') as FormArray;
  }

  addTargetGrp(): void {
    if(this.targets.length < 5) {
      const targetGroup = this.fb.group({
        projectName: ['', Validators.required]
      });
      this.targets.push(targetGroup); // Use the getter to access the FormArray
    } else {
      this.toastr.warning('Maximum 5 Target limit for comparison!')
    }
  }

  removeTargetGrp(index: number): void {
    if(this.targets.length === 2) {
      this.toastr.warning('Minimum 2 Target required for Comparison!')
    } else {
      this.targets.removeAt(index);
    }
  }

  onSubmitTarget(): void {
    console.log(this.targetForm.value);
  }
}
