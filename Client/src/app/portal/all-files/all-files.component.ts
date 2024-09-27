import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AudioDetailsComponent } from '../audio-details/audio-details.component';

@Component({
  selector: 'app-all-files',
  templateUrl: './all-files.component.html',
  styleUrls: ['./all-files.component.scss']
})
export class AllFilesComponent {
  isAllFiles: boolean = true;
  project:any[] = [
    {
      name: "Project Alpha",
      country: "India",
      state: "Maharashtra",
      targetGroup: "Target group 1",
      ageGroup: "18-24",
      competition: "Product A",
      maricoProduct: "Product A",
    },
    {
      name: "Project Alpha",
      country: "India",
      state: "Maharashtra",
      targetGroup: "Target group 2",
      ageGroup: "25-34",
      competition: "Product B",
      maricoProduct: "Product B",
    },
    {
      name: "Project Alpha",
      country: "India",
      state: "Maharashtra",
      targetGroup: "Target group 3",
      ageGroup: "35-44",
      competition: "Product C",
      maricoProduct: "Product C",
    },
    {
      name: "Project Beta",
      country: "India",
      state: "Karnataka",
      targetGroup: "Target group 4",
      ageGroup: "18-24",
      competition: "Product D",
      maricoProduct: "Product D",
    },
    {
      name: "Project Beta",
      country: "India",
      state: "Karnataka",
      targetGroup: "Target group 5",
      ageGroup: "25-34",
      competition: "Product E",
      maricoProduct: "Product E",
    },
    {
      name: "Project Beta",
      country: "India",
      state: "Karnataka",
      targetGroup: "Target group 6",
      ageGroup: "35-44",
      competition: "Product F",
      maricoProduct: "Product F",
    },
    {
      name: "Project Gamma",
      country: "India",
      state: "Delhi",
      targetGroup: "Target group 7",
      ageGroup: "18-24",
      competition: "Product G",
      maricoProduct: "Product G",
    },
    {
      name: "Project Gamma",
      country: "India",
      state: "Delhi",
      targetGroup: "Target group 8",
      ageGroup: "25-34",
      competition: "Product H",
      maricoProduct: "Product H",
    },
    {
      name: "Project Gamma",
      country: "India",
      state: "Delhi",
      targetGroup: "Target group 9",
      ageGroup: "35-44",
      competition: "Product I",
      maricoProduct: "Product I",
    },
    {
      name: "Project Gamma",
      country: "India",
      state: "Delhi",
      targetGroup: "Target group 10",
      ageGroup: "25-34",
      competition: "Product H",
      maricoProduct: "Product H",
    },
    {
      name: "Project Gamma",
      country: "India",
      state: "Delhi",
      targetGroup: "Target group 11",
      ageGroup: "35-44",
      competition: "Product I",
      maricoProduct: "Product I",
    }
  ];
  loading: boolean = true;
  constructor() {

  }

  ngOnInit() {
    this.loading = false;
  }

  changeFileOption(val:string) {
    this.isAllFiles = (val === 'all');
  }

}
