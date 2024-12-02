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

  constructor(private fb: FormBuilder, private toastr: ToastrService, private commonServ: CommonService,
    private audioServ: AudioService, private router: Router) {

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
    this.commonServ.getAPI('master/project/all').subscribe(
      (res: any) => {
        this.existingProject = res.data;
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

  changeOption(isCompProj: boolean) {
    this.isProjectCompare = isCompProj;
  }

  get projects(): FormArray {
    return this.projectForm.get('projects') as FormArray;
  }

  addProject(): void {
    if (this.projects.length < 5) {
      const projectGroup = this.fb.group({
        projectName: ['', Validators.required]
      });
      this.projects.push(projectGroup);

      this.setupAutocomplete(this.projects.length - 1);
    } else {
      this.toastr.warning('Maximum 5 project limit for comparison!');
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

  onSubmitProject(): void {
    const param = {
      arr: this.projectForm.value.projects,
      isProject: true
    }
    this.commonServ.setCompareObj(param);
    this.router.navigate(['/portal/comparison/comparison-detail']);
  }

  get targets(): FormArray {
    return this.targetForm.get('targets') as FormArray;
  }

  addTargetGrp(): void {
    if (this.targets.length < 5) {
      const targetGroup = this.fb.group({
        targetName: ['', Validators.required]
      });
      this.targets.push(targetGroup); // Use the getter to access the FormArray
    } else {
      this.toastr.warning('Maximum 5 Target limit for comparison!')
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
    const param = {
      arr: this.targetForm.value.targets,
      isProject: false
    }
    this.commonServ.setCompareObj(param);
    this.router.navigate(['/portal/comparison/comparison-detail']);
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedProject = event.option.value;
    this.existingTGs = [];
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
