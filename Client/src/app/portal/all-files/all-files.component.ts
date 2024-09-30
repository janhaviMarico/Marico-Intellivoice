import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AudioDetailsComponent } from '../audio-details/audio-details.component';
import { AudioService } from '../service/audio.service';

@Component({
  selector: 'app-all-files',
  templateUrl: './all-files.component.html',
  styleUrls: ['./all-files.component.scss']
})
export class AllFilesComponent {
  isAllFiles: boolean = true;
  project:any[] = [];
  loading: boolean = true;
  userId:string = 'testuser4';
  constructor(private audioServ:AudioService) {

  }

  ngOnInit() {
    this.getProjectData();
  }

  getProjectData() {
    this.audioServ.getData('audio/list', this.userId).subscribe((res:any)=> {
      this.project = res.data;
      this.loading = false;
    }, (err:any)=> {
      this.loading = false;
    })
  }

  changeFileOption(val:string) {
    this.isAllFiles = (val === 'all');
  }

}
