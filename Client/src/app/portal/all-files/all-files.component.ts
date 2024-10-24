import { Component } from '@angular/core';
import { AudioService } from '../service/audio.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

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
  constructor(private audioServ:AudioService,private router:Router, private toastr: ToastrService) {

  }

  ngOnInit() {
    this.getProjectData();
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

}
