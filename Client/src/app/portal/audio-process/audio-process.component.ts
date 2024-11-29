import { Component, ElementRef, signal, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, of, startWith } from 'rxjs';
import { AudioService } from '../service/audio.service';
import { CommonService } from '../service/common.service';
import { InfoComponent } from '../project/info/info.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { v4 as uuidv4 } from 'uuid';
import { Router } from '@angular/router';

interface AudioFile {
  name: string;
  size: string;
  data: File;
  url?: string;
  currentTime?: string;   // Track time for each audio
  durationTime?: string;  // Duration for each audio
  seekValue?: number;     // Seek value for progress bar
}

@Component({
  selector: 'app-audio-process',
  templateUrl: './audio-process.component.html',
  styleUrls: ['./audio-process.component.scss']
})
export class AudioProcessComponent {
  //Add Project Code
  @ViewChild('formEnd') formEnd!: ElementRef;
  targetForm!: FormGroup;
  targetGrpArr: any[] = [];
  target: any;
  countries: any[] = [
    { name: 'India', code: 'IN' },
    { name: 'Bangladesh', code: 'BD' },
    { name: 'Vietnam', code: 'VT' },
    { name: 'England', code: 'EG' }
  ];
  states: any[] = [
    { name: 'Maharastra', code: 'MH' },
    { name: 'Gujrat', code: 'GJ' },
    { name: 'Kerala', code: 'KR' },
    { name: 'Punjab', code: 'PJ' }
  ];
  competitors: any[] = [
    { name: 'Dabur Gold', code: 'DG' },
    { name: 'Nihar Naturals', code: 'NN' },
    { name: 'Fortune Oil', code: 'FO' },
    { name: 'Sundrop', code: 'SU' }
  ]
  products: any[] = [
    { name: 'Parachute', code: 'PR' },
    { name: 'Livon', code: 'LV' },
    { name: 'Saffola', code: 'SF' },
    { name: 'X-Men', code: 'XM' }
  ]
  primaryLang: any[] = [
    { name: 'English', code: 'EN' },
    { name: 'Marathi', code: 'MR' },
    { name: 'Hindi', code: 'HN' },
    { name: 'Gujrati', code: 'GJ' }
  ]
  otherLang: any[] = [
    { name: 'English', code: 'EN' },
    { name: 'Marathi', code: 'MR' },
    { name: 'Hindi', code: 'HN' },
    { name: 'Gujrati', code: 'GJ' }
  ];
  filteredOtherLang: any[] = [...this.otherLang];

  existingProject: any[] = [];
  filteredProject!: Observable<any[]>;
  myControl = new FormControl('');
  isExitingProj:boolean = false;
  steps = ['Project Details', 'Add Media', 'Assign TG', 'Upload Audio'];
  currentStep = 0;

  //Media Code
  audioFiles: AudioFile[] = [];
  //@ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  @ViewChild('selectElement') selectElement!: MatSelect;
  selectedArr: AudioFile[] = []; // Array for selected files
  isPlayingIndex: number | null = null;
  selectedTargetGrp = null;
  expansionArr: any[] = [];
  isProcessingDisable: boolean = true;
  isLoading: boolean = false;
  targetGrps!: { targetGrpArr: any[] };
  readonly panelOpenState = signal(false);

  constructor(private fb: FormBuilder,private audioServ: AudioService, private router: Router, 
    private toastr: ToastrService, private commonServ: CommonService, private dialog: MatDialog) {}

  ngOnInit() {
    //Add Project Code
    this.getAllMaster();
    this.getExistingProject();
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
        this.targetForm.get('otherLangs')?.setValue(selectedOtherLangs.filter((lang: any) => lang !== selectedPrimaryLang));
      }
    });

    //Media Code
  }

  //Add Project Code
  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.existingProject.filter((option:any) => option.ProjName.toLowerCase().includes(filterValue));
  }

  getAllMaster() {
    this.commonServ.getAPI('master/all').subscribe((res: any) => {
      if (res.statusCode == 200) {
        this.countries = res.data[0].country;
        this.states = res.data[0].state;
        this.products = res.data[0].marico_product;
      }
    }, (err: any) => {
      this.toastr.error('Something Went Wrong!')
    })
  }

  getExistingProject() {
    this.commonServ.getAPI('master/project/all').subscribe((res:any)=> {
      this.existingProject = res.data;
      const projectControl = this.targetForm.get('projectName');
      if (projectControl) {
        this.filteredProject = projectControl.valueChanges.pipe(
          startWith(''),
          map(value => this._filter(value || '')),
        );
      } else {
        this.filteredProject = of([]);
      }
    },(err:any)=>{
      this.toastr.error('Something Went Wrong!')
    })
  }

  changeProject() {
    this.isExitingProj = !this.isExitingProj;
  }

  onSubmit() {
    if (this.targetForm.invalid) {
      this.targetForm.markAllAsTouched();
      return;
    }
    if (this.targetForm.value.minAge > this.targetForm.value.maxAge) {
      this.toastr.warning('Minimum Age is less than Maximum Age');
      return;
    }
    if (this.targetForm.valid) {
      this.targetForm.controls['projectName'].enable();

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
        this.toastr.warning('This target group already exists!');
        this.targetForm.controls['projectName'].disable();
      }
    }
    setTimeout(() => {
      this.scrollToBottom();
    }, 200);
  }

  generateTargetGroupName(): string {
    // Extract form values
    const projectName = this.targetForm.get('projectName')?.value.replace(/\s+/g, '') || 'Project';
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
    const selectedCountry = this.countries.find(country => country.name === countryName)?.code || 'NA';
    const selectedState = this.states.find(state => state.name === stateName)?.code || 'NA';
    const selectedCompetitors = competitorNames.map((name: any) => this.competitors.find((c: any) => c.name === name)?.code || name).join('-');
    const selectedProduct = this.products.find(product => product.name === maricoProductName)?.code || 'ProductCode';
    const selectedPrimaryLang = this.primaryLang.find(lang => lang.name === primaryLangName)?.code || 'PrimaryLangCode';
    const selectedOtherLangs = otherLangNames.map((name: any) => this.otherLang.find((lang: any) => lang.name === name)?.code || name).join('-');
    const uniqueId = new Date().getTime();
    return `${selectedCountry}_${selectedState}_${selectedCompetitors}_${selectedProduct}_${minAge}_${maxAge}_${selectedPrimaryLang}_${selectedOtherLangs}_${numSpeakers}_${projectName}_${uniqueId}`;
  }

  removeTargetGroup(index: number): void {
    const name = this.targetGrpArr[index].name
    const info = {
      name: 'deleteTarget', title: name
    }
    this.dialog.open(InfoComponent, {
      height: '20vh',
      width: '30vw',
      disableClose: true,
      data: info
    });
    this.commonServ.deleteTarget.subscribe((res) => {
      if (res === true) {
        this.targetGrpArr.splice(index, 1);
        if (this.targetGrpArr.length === 0) {
          this.targetForm.controls['projectName'].enable();
          document.body.querySelectorAll('.tooltips').forEach(element => {
            element.remove();
          });
        }
      }
    })

  }

  mouseEnter(tg: any) {
    this.target = tg;
  }

  clearForm() {
    const projectNameValue = this.targetForm.get('projectName')?.value;
    this.targetForm.reset();
    this.targetForm.patchValue({
      projectName: projectNameValue
    });
  }

  scrollToBottom(): void {
    this.formEnd.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  //Media Code
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.audioFiles.push({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        data: file,
        url: URL.createObjectURL(file)
      });
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();

    if (event.dataTransfer?.files?.length) {
      const files = event.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.audioFiles.push({
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          data: file,
          url: URL.createObjectURL(file)
        });
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault(); 
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  isPlayingIndexMap: { expansion: number | null; audioFiles: number | null } = {
    expansion: null,
    audioFiles: null
  };

  togglePlayPause(index: number, audioList: any[], section: 'expansion' | 'audioFiles'): void {
    let audioElements: NodeListOf<HTMLAudioElement>;

    // Get the correct set of audio elements based on the section ('expansion' or 'audioFiles')
    if (section === 'expansion') {
      audioElements = document.querySelectorAll('.expansion-section audio');
    } else {
      audioElements = document.querySelectorAll('.audio-files-section audio');
    }

    // Handle play/pause logic for the specific section
    const isPlayingIndex = this.isPlayingIndexMap[section];

    if (isPlayingIndex !== null && isPlayingIndex !== index) {
      // Stop the previously playing audio in the same section
      const prevAudio = audioElements[isPlayingIndex] as HTMLAudioElement;
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
    }

    const audio = audioElements[index] as HTMLAudioElement;

    if (audio.paused) {
      audio.play();
      this.isPlayingIndexMap[section] = index;  // Update the playing index for this section
    } else {
      audio.pause();
      this.isPlayingIndexMap[section] = null;  // Reset the playing index for this section
    }
  }

  isPlaying(index: number, section: 'expansion' | 'audioFiles'): boolean {
    return this.isPlayingIndexMap[section] === index;
  }

  updateProgress(event: any, index: number, audioList: any[]): void {
    const audio = event.target;
    const currentTime = audio.currentTime;
    const duration = audio.duration;

    // Update specific audio file's progress and time
    audioList[index].seekValue = (currentTime / duration) * 100;
    audioList[index].currentTime = this.formatTime(currentTime);
    audioList[index].durationTime = this.formatTime(duration);

    this.updateSliderTrack(index, audioList);
  }

  seekAudio(event: any, index: number, audioList: any[]): void {
    const audio = document.querySelectorAll('audio')[index] as HTMLAudioElement;
    const newTime = (event.target.value / 100) * audio.duration;
    audio.currentTime = newTime;
  }

  updateSliderTrack(index: number, audioList: any[]): void {
    const slider = document.querySelectorAll('.seek-bar')[index] as HTMLInputElement;
    if (slider) {
      const value = (audioList[index].seekValue ?? 0) / 100 * slider.offsetWidth;
      slider.style.background = `linear-gradient(to right, #007bff ${audioList[index].seekValue}%, #d3d3d3 ${audioList[index].seekValue}%)`;
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${minutes}:${sec < 10 ? '0' : ''}${sec}`;
  }

  toggleSelectFile(file: AudioFile, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedArr.push(file);
      //this.audioFiles = this.audioFiles.filter((f) => f !== file);
    } else {
      //this.audioFiles.push(file);
      this.selectedArr = this.selectedArr.filter((f) => f !== file);
    }
  }

  // Delete file functionality
  deleteFile(index: number): void {
    this.audioFiles.splice(index, 1);
    if (this.isPlayingIndex === index) {
      this.isPlayingIndex = null;
    }
  }

  assignTargetGrp(event: MatSelectChange) {
    this.currentStep = 2;
    const selectedValue = event.value; // Name of the selected item
    const selectedIndex = this.targetGrps.targetGrpArr.findIndex((tg:any) => tg.name === selectedValue);
    if (this.selectedArr.length !== 0) {
      if (this.targetGrps.targetGrpArr[selectedIndex].audioList) {
        this.targetGrps.targetGrpArr[selectedIndex].audioList.push(...this.selectedArr);
      } else {
        this.targetGrps.targetGrpArr[selectedIndex].audioList = [...this.selectedArr];
      }

      // For expansionArr
      const expansionIndex = this.expansionArr.findIndex(exp => exp.name === selectedValue);
      if (expansionIndex !== -1) {
        // If the selected value already exists in expansionArr
        this.expansionArr[expansionIndex].audioList.push(...this.selectedArr);
      } else {
        // If the selected value is not in expansionArr, add a new object
        this.expansionArr.push({
          name: selectedValue,
          audioList: [...this.selectedArr]
        });
      }

      this.audioFiles = this.audioFiles.filter(audioFile =>
        !this.selectedArr.some(selected => selected === audioFile)
      );

      this.selectedArr = [];
      this.selectedTargetGrp = null;
      this.selectElement.value = null;
      this.processBtnDisable();
    } else {
      this.toastr.warning('Please Select Audio');
      this.selectedTargetGrp = null;
      this.selectElement.value = null;
    }
  }

  removeFileFromExpansionList(expIndex: number, fileIndex: number, isDelete: boolean = false): void {
    const fileToMove = this.expansionArr[expIndex].audioList[fileIndex];
    if (!isDelete) {
      this.audioFiles.push(fileToMove);
    }
    this.expansionArr[expIndex].audioList.splice(fileIndex, 1);

    if (this.expansionArr[expIndex].audioList.length === 0) {
      this.expansionArr.splice(expIndex, 1);
      this.currentStep = 1;
    }
    this.processBtnDisable();
  }

  audioProcessing() {
    this.isLoading = true;
    const formData = new FormData();
    var Project: any;
    var TargetGrp: any = [];
    var tgArr: any[] = [];
    for (let i = 0; i < this.targetGrps.targetGrpArr.length; i++) {
      if (i == 0) {
        Project = {
          ProjName: this.targetGrps.targetGrpArr[i].projectName,
          userid: localStorage.getItem('User'),
          ProjId: uuidv4(),
          TGIds: []
        }
      }
      const temp = {
        ProjId: Project.ProjId,
        TGName: this.targetGrps.targetGrpArr[i].name,
        AudioName: this.targetGrps.targetGrpArr[i].name,
        Country: this.targetGrps.targetGrpArr[i].country,
        State: this.targetGrps.targetGrpArr[i].state,
        AgeGrp: `${this.targetGrps.targetGrpArr[i].minAge} - ${this.targetGrps.targetGrpArr[i].maxAge}`,
        CompetetionProduct: this.targetGrps.targetGrpArr[i].competitors,
        MaricoProduct: this.targetGrps.targetGrpArr[i].maricoProduct,
        MainLang: this.targetGrps.targetGrpArr[i].primaryLang,
        SecondaryLang: this.targetGrps.targetGrpArr[i].otherLangs,
        noOfSpek: this.targetGrps.targetGrpArr[i].numSpeakers,
        filePath: ""
      }
      const originalExtension = this.targetGrps.targetGrpArr[i].audioList[0].data.name.substring(this.targetGrps.targetGrpArr[i].audioList[0].data.name.lastIndexOf('.'));
      const renamedFile = new File([this.targetGrps.targetGrpArr[i].audioList[0].data], `${this.targetGrps.targetGrpArr[i].name}${originalExtension}`, { type: this.targetGrps.targetGrpArr[i].audioList[0].data.type });
      formData.append('files', renamedFile);
      TargetGrp.push(temp)
      tgArr.push(this.targetGrps.targetGrpArr[i].name);
    }
    Project["TGIds"] = tgArr;

    formData.append('Project', JSON.stringify(Project));
    formData.append('TargetGrp', JSON.stringify(TargetGrp));
    this.audioServ.postAPI('audio/upload', formData).subscribe((res: any) => {
      this.isLoading = false;

      this.ClearProject();
      this.ClearMedia();
    }, (err: any) => {
      this.isLoading = false;
      this.toastr.error('Somthing Went Wrong');
    })
  }

  processBtnDisable() {
    this.isProcessingDisable = !(this.audioFiles.length === 0 && this.expansionArr.length > 0);
  }

  //Overall Code
  nextStep() {
    if(this.currentStep === 0) {
      this.targetGrps = {targetGrpArr : this.targetGrpArr};
    }
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  previousStep() {
    if(this.currentStep === 2) {
      this.currentStep = this.currentStep - 2;
    } else if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  ClearProject() {
    this.targetGrpArr = [];
    this.targetForm.reset();
    this.currentStep = 4;
  }

  ClearMedia() {
    this.audioFiles = [];
    this.selectedArr = [];
    this.expansionArr = [];
    this.targetGrps = {targetGrpArr : []};
  }

  AddAnotherProject() {
    this.currentStep = 0;
  }

  closeAudioProcess() {
    this.router.navigate(['/portal/dashboard'])
  }
}
