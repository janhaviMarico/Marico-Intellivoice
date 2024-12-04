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
  project:any[] = [];
  userId:string = 'testuser4';
  isLoading: boolean = true;
  myControl = new FormControl('');
  options: string[] = ['One', 'Two', 'Three'];
  filteredOptions!: Observable<any[]>;
  existingProject:any[] = [];
  selectedProject: string = '';
  constructor(private audioServ:AudioService,private router:Router, private toastr: ToastrService,
    private commonServ:CommonService
  ) { }

  ngOnInit() {
    this.getProjectData();
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

  getProjectData() {
    this.audioServ.getData('audio/list', this.userId).subscribe((res:any)=> {
      this.project = res.data;
      this.isLoading = false;
    }, (err:any)=> {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!')
    })
  }

  changeFileOption(val:string) {
    this.isAllFiles = (val === 'all');
  }

  viewDetails(tgId:string, tgName:string) {
    this.router.navigate(["portal/allFiles/audioDetails/"+tgId+"/"+tgName]);
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedProject = event.option.value;
  }

}
