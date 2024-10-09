import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UploadFileComponent } from '../upload-file/upload-file.component';
import { AudioService } from '../../service/audio.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-add-project',
  templateUrl: './add-project.component.html',
  styleUrls: ['./add-project.component.scss']
})
export class AddProjectComponent {
  targetForm!: FormGroup;
  targetGrpArr:any[] = [];
  target:any;
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
  constructor(private fb: FormBuilder, private dialog: MatDialog, public dialogRef: MatDialogRef<AddProjectComponent>,
    private audioServ:AudioService, private toastr: ToastrService
  ) {}

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
    });

    this.targetForm.get('primaryLang')?.valueChanges.subscribe((selectedPrimaryLang) => {
      this.filteredOtherLang = this.otherLang.filter(lang => lang.name !== selectedPrimaryLang);
      
      // Optionally, clear selected other languages if they include the primary language
      const selectedOtherLangs = this.targetForm.get('otherLangs')?.value || [];
      if (selectedOtherLangs.includes(selectedPrimaryLang)) {
        this.targetForm.get('otherLangs')?.setValue(selectedOtherLangs.filter((lang:any) => lang !== selectedPrimaryLang));
      }
    });


    this.audioServ.closeDialog.subscribe((res:any)=> {
      if(res) {
        this.dialogRef.close();
      }
    })
  }

  onSubmit() {
    if(this.targetForm.value.minAge > this.targetForm.value.maxAge) {
      this.toastr.warning('Minimum Age is less than Maximum Age');
      return;
    }
    if (this.targetForm.valid) {
      const currentFormValues = { ...this.targetForm.value };
      delete currentFormValues.name;

      const isDuplicate = this.targetGrpArr.some(group => {
        const groupWithoutName = { ...group };
        delete groupWithoutName.name;
  
        return JSON.stringify(groupWithoutName) === JSON.stringify(currentFormValues);
      });
  
      if (!isDuplicate) {
        
        const targetGroupName = this.generateTargetGroupName();
        this.targetGrpArr.push({
          ...this.targetForm.value,
          name: targetGroupName
        });
        this.toastr.success('Target Grope Created Sucessfully!')
        this.targetForm.controls['projectName'].disable();
        this.clearForm();
      } else {
        alert('This target group already exists!');
      }
    }
  }

  generateTargetGroupName(): string {

    // Extract form values
  const projectName = this.targetForm.get('projectName')?.value || 'Project';
  const countryName = this.targetForm.get('country')?.value || 'Country';
  const stateName = this.targetForm.get('state')?.value || 'State';
  const competitorNames = this.targetForm.get('competitors')?.value || [];
  const maricoProductName = this.targetForm.get('maricoProduct')?.value || 'Product';
  const minAge = this.targetForm.get('minAge')?.value || 'MinAge';
  const maxAge = this.targetForm.get('maxAge')?.value || 'MaxAge';
  const primaryLangName = this.targetForm.get('primaryLang')?.value || 'PrimaryLang';
  const otherLangNames = this.targetForm.get('otherLangs')?.value || [];
  const numSpeakers = this.targetForm.get('numSpeakers')?.value || 'NumSpeakers';

  // Mapping selected values to their corresponding codes
  const selectedCountry = this.countries.find(country => country.name === countryName)?.code || 'CountryCode';
  const selectedState = this.states.find(state => state.name === stateName)?.code || 'StateCode';
  const selectedCompetitors = competitorNames.map((name:any) => this.competitors.find((c:any) => c.name === name)?.code || name).join('-');
  const selectedProduct = this.products.find(product => product.name === maricoProductName)?.code || 'ProductCode';
  const selectedPrimaryLang = this.primaryLang.find(lang => lang.name === primaryLangName)?.code || 'PrimaryLangCode';
  const selectedOtherLangs = otherLangNames.map((name:any) => this.otherLang.find((lang:any) => lang.name === name)?.code || name).join('-');
    const uniqueId = new Date().getTime();
    return `${selectedCountry}_${selectedState}_${selectedCompetitors}_${selectedProduct}_${minAge}_${maxAge}_${selectedPrimaryLang}_${selectedOtherLangs}_${numSpeakers}_${projectName}_${uniqueId}`;
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
    if(this.targetGrpArr.length === 0) {
      this.targetForm.controls['projectName'].enable();
      document.body.querySelectorAll('.tooltips').forEach(element => {
        element.remove();
      });
    }
  }

  mouseEnter(tg:any) {
    this.target = tg;
  }

  closeDailog() {
    this.dialogRef.close();
  }

  clearForm() {
    const projectNameValue = this.targetForm.get('projectName')?.value;
    this.targetForm.reset();
    this.targetForm.patchValue({
      projectName: projectNameValue
    });
  }
}
