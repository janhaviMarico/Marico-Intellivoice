import { Component } from '@angular/core';
import { CommonService } from '../service/common.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent {
  userList:any[] = [];
  isLoading: boolean = false;
  constructor(private commonServ:CommonService,private toastr: ToastrService) {}

  ngOnInit() {
    this.isLoading = true;
    this.commonServ.getAPI('users/all').subscribe((res:any)=> {
      this.isLoading = false;
      this.userList = res;
    },(err:any)=> {
      this.isLoading = false;
        this.toastr.error('Something Went Wrong!')
    });
  }
}
