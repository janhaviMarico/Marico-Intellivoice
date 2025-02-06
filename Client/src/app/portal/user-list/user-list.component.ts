import { Component, TemplateRef } from '@angular/core';
import { CommonService } from '../service/common.service';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { map, Observable, of, startWith } from 'rxjs';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent {
  userList: any[] = [];
  isLoading: boolean = false;
  userForm!: FormGroup;
  roles: any[] = [
    {
      name: "Base User",
      code: "1"
    },
    {
      name: "Admin User",
      code: "2"
    },
    {
      name: "Read User",
      code: "3"
    }
  ];

  dialogRef!: MatDialogRef<any>;
  lastFilter: string = '';
  selectedUsers: any[] = new Array<any>();
  mapUnmapUsers: any[] = [];
  filteredCompetetiveProduct!: Observable<any[]>;

  constructor(private commonServ: CommonService, private toastr: ToastrService,
    private fb: FormBuilder, private dialog: MatDialog
  ) {
    this.userForm = this.fb.group({
      userName: ['', Validators.required],
      userEmail: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      mapUnmapUsers: [[]]
    });
  }

  ngOnInit() {
    this.isLoading = true;
    this.getUserList();
  }

  getUserList() {
    this.commonServ.getAPI('users/all').subscribe((res: any) => {
      this.isLoading = false;
      this.userList = res;
    }, (err: any) => {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!')
    });
  }

  editDialog(editTemplate: TemplateRef<any>, index: number) {

    this.userForm.controls['userName'].setValue(this.userList[index].userName);
    this.userForm.controls['userEmail'].setValue(this.userList[index].email);
    this.userForm.controls['role'].setValue(this.userList[index].rolecode);

    this.assignMapUnmapUser(index);

    this.userForm.get('mapUnmapUsers')!.setValue(this.selectedUsers);

    this.dialogRef = this.dialog.open(editTemplate, {
      width: '30%',
      disableClose: true,
    });
  }

  submitForm() {
    const userIds = this.selectedUsers.map(user => user.userid);
    const param = {
      name: this.userForm.value.userName,
      email: this.userForm.value.userEmail,
      role: this.userForm.value.role,
      mapUser: userIds
    }
    this.commonServ.postAPI('users/edit', param).subscribe((res: any) => {
      this.toastr.success(res.message);
      this.closeDialog();
      this.getUserList()
    }, (err: any) => {
      this.toastr.error('Something Went Wrong!');
    })
  }

  closeDialog() {
    this.dialogRef.close();
    this.userForm.reset();
  }

  filterForCompetitor() {
    this.filteredCompetetiveProduct = of(this.lastFilter).pipe(
      startWith<string>(''),
      map(value => (typeof value === 'string' ? value : this.lastFilter)),
      map(filter => this.filter(filter))
    );
  }

  filter(filter: string): any[] {
    this.lastFilter = filter;
    if (filter) {
      return this.mapUnmapUsers.filter(option => {
        return option.email.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      })
    } else {
      return this.mapUnmapUsers.slice();
    }
  }

  optionClicked(event: Event, user: any) {
    event.stopPropagation();
    this.toggleSelection(user);
  }

  toggleSelection(user: any) {
    user.selected = !user.selected;
    if (user.selected) {
      this.selectedUsers.push(user);
    } else {
      const i = this.selectedUsers.findIndex((value: any) => value.email === user.email);
      this.selectedUsers.splice(i, 1);
    }

    this.userForm.get('mapUnmapUsers')!.setValue(this.selectedUsers);
    this.filteredCompetetiveProduct = of(this.mapUnmapUsers);
  }

  displayFn(value: any[] | string): string {
    return '';
  }

  assignMapUnmapUser(index: number) {
    const email = this.userList[index].email;
    this.mapUnmapUsers = [];
    this.mapUnmapUsers = this.userList.filter(user => user.email !== email)
    .map(user => ({
      ...user,
      selected: this.userList[index]?.mapUser?.includes(user.id) ? true : false
    }));

    this.selectedUsers = this.userList[index]?.mapUser
      ? this.userList
        .filter(user => this.userList[index].mapUser.includes(user.id))
        .map(user => ({ ...user, selected: true }))
      : [];

    this.filteredCompetetiveProduct = of(this.mapUnmapUsers);
  }
}
