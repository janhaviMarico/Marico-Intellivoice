import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UploadFileComponent } from '../upload-file/upload-file.component';

@Component({
  selector: 'app-add-project',
  templateUrl: './add-project.component.html',
  styleUrls: ['./add-project.component.scss']
})
export class AddProjectComponent {
  targetForm!: FormGroup;
  targetGrpArr:any[] = [
    {name: "Gruop 1"},
    {name: "Gruop 2"},
    {name: "Gruop 3"},
  ];
  countries: any[] = [
    {name: 'India', code: 'IN'},
    {name: 'Bangladesh', code: 'BD'},
    {name:'Vietnam',code:'VT'},
    {name: 'England', code:'EG'}
  ];
  states: any[] = [
    {name: 'Maharastra', code: 'MH'},
    {name: 'Gujrat', code: 'GJ'},
    {name:'Kerala',code:'KR'},
    {name: 'Punjab', code:'PJ'}
  ];
  competitors: any[] = [
    {name: 'Dabur Gold', code: 'DG'},
    {name: 'Nihar Naturals', code: 'NN'},
    {name:'Fortune Oil',code:'FO'},
    {name: 'Sundrop', code:'SU'}
  ]
  products: any[] = [
    {name: 'Parachute', code: 'PR'},
    {name: 'Livon', code: 'LV'},
    {name:'Saffola',code:'SF'},
    {name: 'X-Men', code:'XM'}
  ]
  primaryLang:any[] = [
    {name: 'English', code: 'EN'},
    {name: 'Marathi', code: 'MR'},
    {name:'Hindi',code:'HN'},
    {name: 'Gujrati', code:'GJ'}
  ]
  otherLang:any[] = [
    {name: 'English', code: 'EN'},
    {name: 'Marathi', code: 'MR'},
    {name:'Hindi',code:'HN'},
    {name: 'Gujrati', code:'GJ'}
  ];
  filteredOtherLang: any[] = [...this.otherLang];
  constructor(private fb: FormBuilder, private dialog: MatDialog, public dialogRef: MatDialogRef<UploadFileComponent>) {}

  ngOnInit() {
    this.targetForm = this.fb.group({
      projectName: ['', Validators.required],
      country: ['', Validators.required],
      state: ['', Validators.required],
      competitors: [[], Validators.required],  // Multi-select dropdown for competitors
      maricoProduct: ['', Validators.required],
      minAge: [null, [Validators.required, Validators.min(0)]],
      maxAge: [null, [Validators.required, Validators.min(0)]],
      primaryLang: ['', Validators.required],
      otherLangs: [[], Validators.required],  // Multi-select dropdown for other languages
      numSpeakers: [null, [Validators.required, Validators.min(1)]],
    }, { validator: this.ageRangeValidator('minAge', 'maxAge') });

    this.targetForm.get('primaryLang')?.valueChanges.subscribe((selectedPrimaryLang) => {
      this.filteredOtherLang = this.otherLang.filter(lang => lang.code !== selectedPrimaryLang);
      
      // Optionally, clear selected other languages if they include the primary language
      const selectedOtherLangs = this.targetForm.get('otherLangs')?.value || [];
      if (selectedOtherLangs.includes(selectedPrimaryLang)) {
        this.targetForm.get('otherLangs')?.setValue(selectedOtherLangs.filter((lang:any) => lang !== selectedPrimaryLang));
      }
    });
  }

  ageRangeValidator(minAgeField: string, maxAgeField: string): ValidatorFn {
    return (formGroup: AbstractControl): { [key: string]: any } | null => {
      const minAge = formGroup.get(minAgeField)?.value;
      const maxAge = formGroup.get(maxAgeField)?.value;
  
      if (minAge !== null && maxAge !== null && minAge >= maxAge) {
        return { ageRangeInvalid: true };  // Custom validation error key
      }
      return null;
    };
  }

  onSubmit() {
    if (this.targetForm.valid) {
      const currentFormValues = { ...this.targetForm.value };
      // Remove the 'name' field from the current form values (if it exists)
      delete currentFormValues.name;
  
      // Step 1: Check if the form values already exist in the targetGrpArr (excluding the 'name' field)
      const isDuplicate = this.targetGrpArr.some(group => {
        const groupWithoutName = { ...group };
        delete groupWithoutName.name; // Remove 'name' field from each group in the array
  
        return JSON.stringify(groupWithoutName) === JSON.stringify(currentFormValues);
      });
  
      if (!isDuplicate) {
        // Step 2: If not a duplicate, add the new target group to targetGrpArr
        //this.targetGrpArr.push(currentFormValues);
        const targetGroupName = this.generateTargetGroupName(); // Call the new function to get the name
        this.targetGrpArr.push({
          ...this.targetForm.value,
          name: targetGroupName
        });
        //this.targetGrpArr[this.targetGrpArr.length - 1]['name'] = `Target Grp ${this.targetGrpArr.length}`;
  
        console.log(this.targetGrpArr);
  
        // Step 3: Preserve the project name and reset the form
        const projectNameValue = this.targetForm.get('projectName')?.value;
        this.targetForm.reset();
        this.targetForm.patchValue({
          projectName: projectNameValue
        });
      } else {
        // Step 4: Alert the user if the values are the same as an existing group
        console.log('This target group already exists!');
        alert('This target group already exists!');
      }
    }
  }

  generateTargetGroupName(): string {
    // Extract all form field values
    const projectName = this.targetForm.get('projectName')?.value || 'Project';
    const country = this.targetForm.get('country')?.value || 'Country';
    const state = this.targetForm.get('state')?.value || 'State';
    const competitors = (this.targetForm.get('competitors')?.value || []).join('-'); // Multiple competitors joined with hyphen
    const maricoProduct = this.targetForm.get('maricoProduct')?.value || 'Product';
    const minAge = this.targetForm.get('minAge')?.value || 'MinAge';
    const maxAge = this.targetForm.get('maxAge')?.value || 'MaxAge';
    const primaryLang = this.targetForm.get('primaryLang')?.value || 'PrimaryLang';
    const otherLangs = (this.targetForm.get('otherLangs')?.value || []).join('-'); // Multiple languages joined with hyphen
    const numSpeakers = this.targetForm.get('numSpeakers')?.value || 'NumSpeakers';
  
    // Unique identifier based on timestamp
    const uniqueId = new Date().getTime();  // You can format this date as per your needs
  
    // Generate the name by combining all fields with underscores
    return `${country}_${state}_${competitors}_${maricoProduct}_${minAge}_${maxAge}_${primaryLang}_${otherLangs}_${numSpeakers}_${projectName}_${uniqueId}`;
  }
  
  openAudioFileDialog() {
    this.dialog.open(UploadFileComponent, {
      height: '90vh',
      width: '40vw',
      disableClose: true,
      data:  { targetGrpArr: this.targetGrpArr }
    });
  }

  removeTargetGroup(index: number): void {
    this.targetGrpArr.splice(index, 1);
  }

  closeDailog() {
    this.dialogRef.close();
  }
}
