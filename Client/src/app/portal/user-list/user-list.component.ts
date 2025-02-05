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

    this.assignMapUnmapUser(this.userList[index].email);
    this.dialogRef = this.dialog.open(editTemplate, {
      width: '30%',
      disableClose: true,
    });
  }

  submitForm() {
    if (this.userForm.valid) {
      console.log('Form Data:', this.userForm.value);
    }
  }

  closeDialog() {
    this.dialogRef.close();
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

  assignMapUnmapUser(email:string) {
    this.mapUnmapUsers = [];
    this.mapUnmapUsers = this.userList.filter(user => user.email !== email);
    this.filteredCompetetiveProduct = of(this.mapUnmapUsers);
  }
}
