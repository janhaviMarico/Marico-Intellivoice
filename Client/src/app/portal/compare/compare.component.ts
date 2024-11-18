import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, startWith } from 'rxjs';
import { CommonService } from '../service/common.service';

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss']
})
export class CompareComponent implements OnInit {
  isProjectCompare: boolean = true;
  targetForm: FormGroup;

  existingProject: any[] = [];
  filteredProject!: Observable<any[]>;
  myControl = new FormControl('');

  constructor(private fb: FormBuilder,private toastr: ToastrService, private commonServ: CommonService) {

    this.targetForm = this.fb.group({
      projects: this.fb.array([]), // Use 'projects' as the key
    });
  }

  ngOnInit(): void {
    this.addProject();
    this.addProject(); // Add an initial project
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

  // Getter to access the FormArray
  get projects(): FormArray {
    return this.targetForm.get('projects') as FormArray;
  }

  // Add a new project to the FormArray
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

  // Remove a project by index
  removeProject(index: number): void {
    if(this.projects.length === 2) {
      this.toastr.warning('Minimum 2 Project required for Comparison!')
    } else {
      this.projects.removeAt(index); // Use the getter to access the FormArray
    }
    
  }

  // Handle form submission
  onSubmit(): void {
    console.log(this.targetForm.value);
  }
}
