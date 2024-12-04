import { Component } from '@angular/core';
import { AudioService } from '../../service/audio.service';
import { Router } from '@angular/router';
import { CommonService } from '../../service/common.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-compare-detail',
  templateUrl: './compare-detail.component.html',
  styleUrls: ['./compare-detail.component.scss']
})
export class CompareDetailComponent {
  compareArr:any = [{projectName: '', targetCompareProject:''}, {projectName: '',targetCompareProject:''}];
  compareObj:any;
  isLoading:boolean = false;
  summary:string = '';
  constructor(private audioServ:AudioService, private router: Router,
    private commonServ:CommonService, private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.compareObj = this.commonServ.getCompareObj();
    if(this.compareObj) {
      this.compareProjectAndTG();
    }
  }

  isVisible(index: number): boolean {
    return index >= this.currentIndex && index < this.currentIndex + 2;
  }
  
  currentIndex = 0;
  previousIndex = 0;
  
  next() {
    if (this.currentIndex < this.compareArr.length - 2) {
      this.previousIndex = this.currentIndex;
      this.currentIndex += 2;
    }
  }
  
  prev() {
    if (this.currentIndex > 0) {
      this.previousIndex = this.currentIndex;
      this.currentIndex -= 2;
    }
  }

  backBtn() {
    this.router.navigate(['/portal/comparison'])
  }
  
  compareProjectAndTG() {
    this.isLoading = true;
    this.commonServ.getParamAPI('chat/compare', this.compareObj.isProject, this.compareObj.arr).subscribe((res:any)=> {
      this.isLoading = false;
      this.compareArr = [];
      this.compareArr = res?.project;
      this.summary = res?.summary;
    },(err:any)=> {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!')
    })
  }
}
