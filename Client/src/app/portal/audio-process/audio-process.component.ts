import { Component, ElementRef, Renderer2, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { map, Observable, of, startWith } from 'rxjs';
import { AudioService } from '../service/audio.service';
import { CommonService } from '../service/common.service';
import { InfoComponent } from '../Dialog/info/info.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { v4 as uuidv4 } from 'uuid';
import { Router } from '@angular/router';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import Hover from 'wavesurfer.js/dist/plugins/hover';

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
  targetGrpArr: any[] = [
    // {
    //   competitors: ["Dabur Gold"],
    //   country: "India",
    //   maricoProduct: "REVIVE LIQ 400G+95G ROI",
    //   maxAge: 9,
    //   minAge: 6,
    //   name: "IN_AP_DG_111_6_9_EN_MR_3_ak_project_1_1733724860098",
    //   numSpeakers: 3,
    //   otherLangs: ["Marathi"],
    //   primaryLang: "English",
    //   projectName: "ak_project_1",
    //   state: "Andhra Pradesh"
    // }
  ];
  target: any;
  countries: any[] = [];
  states: any[] = [];
  competitors: any[] = []
  products: any[] = []
  primaryLang: any[] = [];
  otherLang: any[] = [];
  filteredOtherLang: any[] = [];

  existingProject: any[] = [];
  filteredProject!: Observable<any[]>;
  filteredCountry!: Observable<any[]>;
  filteredState!: Observable<any[]>;
  filteredMaricoProduct!: Observable<any[]>;
  filteredCompetetiveProduct!: Observable<any[]>;
  steps = ['Project Details', 'Add Media', 'Assign TG', 'Upload Audio'];
  currentStep = 0;

  selectedUsers: any[] = new Array<any>();
  lastFilter: string = '';

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
  //targetGrps: { targetGrpArr: any[] } = { targetGrpArr: this.targetGrpArr };
  baseHref: string = '../../../../';
  readonly panelOpenState = signal(false);

  wavesurfer!: WaveSurfer;
  currentTime: number = 0;
  totalTime: number = 0;

  regions = RegionsPlugin.create();
  regionArr: any[] = [];
  activeRegion: any = null;
  loop: boolean = false;

  hoverPlugin = Hover.create({
    lineColor: '#ff0000',
    lineWidth: 2,
    labelBackground: '#555',
    labelColor: '#fff',
    labelSize: '11px',
  });

  url: any[] = [];

  @ViewChild('waveformContainer', { static: false }) waveformContainer!: ElementRef;
  isAudioPlay: boolean = false;
  editFileName: string = '';
  audioUrlFinal: string = '';

  @ViewChild('audioPlayerFinal') audioPlayerFinal!: ElementRef<HTMLAudioElement>;
  currentTimeFinal: string = '0:00';
  durationTimeFinal: string = '0:00';
  seekValueFinal: number = 0;
  isPlayingFinal: boolean = false;
  dialogRef!: MatDialogRef<any>;
  isEditPlayerLoad:boolean = false;
  transIndex:number = 0;
  audioIndex:number = 0;
  mergedFile:any;
  constructor(private fb: FormBuilder, private audioServ: AudioService, private router: Router,
    private toastr: ToastrService, private commonServ: CommonService, private dialog: MatDialog, private renderer: Renderer2) {
    if (window.location.origin.includes('ai.maricoapps.biz')) {
      this.baseHref = 'Insightopedia/'
    }
  }

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
  getAllMaster() {
    this.commonServ.getAPI('master/all').subscribe((res: any) => {
      if (res.statusCode == 200) {
        this.countries = res.data[0].country;
        this.states = res.data[0].state;
        this.products = res.data[0].marico_product;
        this.primaryLang = res.data[0].Languages;
        this.otherLang = res.data[0].Languages;
        this.filteredOtherLang = [...this.otherLang];
        this.competitors = res.data[0].competetive_product;
        this.filteredCompetetiveProduct = of(this.competitors);
      }

    }, (err: any) => {
      this.toastr.error('Something Went Wrong!')
    })
  }

  filterForCompetitor() {
    this.filteredCompetetiveProduct = of(this.lastFilter).pipe(
      startWith<string>(''),
      map(value => (typeof value === 'string' ? value : this.lastFilter)),
      map(filter => this.filter(filter))
    );
  }

  getExistingProject() {
    this.commonServ.getAPI('master/project/all').subscribe((res: any) => {
      this.existingProject = res.data;
      this.searchFilter();
    }, (err: any) => {
      this.toastr.error('Something Went Wrong!')
    })
  }

  searchFilter() {
    this.filteredProject = this._initializeFilter('projectName', this.existingProject, 'ProjName');
    this.filteredCountry = this._initializeFilter('country', this.countries, 'name');
    this.filteredState = this._initializeFilter('state', this.states, 'name');
    this.filteredMaricoProduct = this._initializeFilter('maricoProduct', this.products, 'name');
  }

  private _initializeFilter(
    controlName: string,
    dataSource: any[],
    property: string
  ): Observable<string[]> {
    const control = this.targetForm.get(controlName);
    if (control) {
      return control.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value || '', dataSource, property))
      );
    }
    return of([]);
  }

  private _filter(value: string, dataSource: any[], property: string): string[] {
    const filterValue = value.toLowerCase();
    return dataSource.filter((option: any) => option[property].toLowerCase().includes(filterValue));
  }

  filter(filter: string): any[] {
    this.lastFilter = filter;
    if (filter) {
      return this.competitors.filter(option => {
        return option.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      })
    } else {
      return this.competitors.slice();
    }
  }

  displayFn(value: any[] | string): string {
    return '';
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
      const i = this.selectedUsers.findIndex((value: any) => value.name === user.name);
      this.selectedUsers.splice(i, 1);
    }

    this.targetForm.get('competitors')!.setValue(this.selectedUsers);
    this.filteredCompetetiveProduct = of(this.competitors);
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
    // const selectedCompetitors = competitorNames.map((name: any) => this.competitors.find((c: any) => c.name === name)?.code || name).join('-');
    const selectedCompetitors = competitorNames.map((competitor: any) => {
      const matchedCompetitor = this.competitors.find((c: any) => c.name === competitor.name);
      return matchedCompetitor ? matchedCompetitor.code : competitor.name || competitor;
    })
      .join('-');
    const selectedProduct = this.products.find(product => product.name === maricoProductName)?.code || '111';
    const selectedPrimaryLang = this.primaryLang.find(lang => lang.name === primaryLangName)?.code || '222';
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
      projectName: projectNameValue,
      maricoProduct: ''
    });
    this.competitors.forEach(user => user.selected = false);
    this.selectedUsers = [];
    this.filteredCompetetiveProduct = of(this.competitors);
    this.filteredMaricoProduct = of(this.products);
  }

  scrollToBottom(): void {
    this.formEnd.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  addEntity(entity: any) {
    let payload = {
      columnName: entity,
      value: ''
    }
    if (entity === 'country') {
      if (this.targetForm.value.country === '') {
        this.toastr.warning('Country field is empty');
        return false;
      } else if (this.countries.some(item => item.name.toLowerCase() === this.targetForm.value.country.toLowerCase())) {
        this.toastr.warning('This Country is already in the List');
        return false;
      } else {
        payload.value = this.targetForm.value.country;
      }
    } else if (entity === 'state') {
      if (this.targetForm.value.state === '') {
        this.toastr.warning('State field is empty');
        return false;
      } else if (this.states.some(item => item.name.toLowerCase() === this.targetForm.value.state.toLowerCase())) {
        this.toastr.warning('This State is already in the List');
        return false;
      } else {
        payload.value = this.targetForm.value.state;
      }
    } else if (entity === 'marico_product') {
      if (this.targetForm.value.maricoProduct === '') {
        this.toastr.warning('Marico Product field is empty');
        return false;
      } else if (this.products.some(item => item.name.toLowerCase() === this.targetForm.value.maricoProduct.toLowerCase())) {
        this.toastr.warning('This Product is already in the List');
        return false;
      } else {
        payload.value = this.targetForm.value.maricoProduct;
      }
    } else if (entity === 'competetive_product') {
      if (this.lastFilter === '') {
        this.toastr.warning('Competitor Product field is empty');
        return false;
      } else if (this.competitors.some(item => item.name.toLowerCase() === this.lastFilter.toLowerCase())) {
        this.toastr.warning('This Competitor is already in the List');
        return false;
      } else {
        payload.value = this.lastFilter;
      }
    }
    this.audioServ.patchData('master/001/update', payload).subscribe((res: any) => {
      this.toastr.success('Add Master Sucessfully!');
      if (entity === 'competetive_product') {
        this.competitors.push({ name: this.lastFilter });
        this.lastFilter = '';
        this.filteredCompetetiveProduct = of(this.competitors);
      }
    }, (err) => {
      this.toastr.error('Something Went Wrong!');
    });
    return;
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
    event.target.value = null;
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
    const selectedIndex = this.targetGrps.targetGrpArr.findIndex((tg: any) => tg.name === selectedValue);
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
    const formData = new FormData();
    let Project: any;
    let TargetGrp: any = [];
    let tgArr: any[] = [];
    
    for (let i = 0; i < this.targetGrps.targetGrpArr.length; i++) {
      if (i == 0) {
        Project = {
          ProjName: this.targetGrps.targetGrpArr[i].projectName,
          userid: localStorage.getItem('tenetId'),
          ProjId: uuidv4(),
          TGIds: []
        }
      }
      const temp: {
        ProjId: string; 
        TGName: string; 
        AudioName: string[];
        Country: string;
        State: string;
        AgeGrp: string;
        CompetetionProduct: string;
        MaricoProduct: string;
        MainLang: string;
        SecondaryLang: string;
        noOfSpek: number;
        filePath: string;
      } = {
        ProjId: Project.ProjId,
        TGName: this.targetGrps.targetGrpArr[i].name,
        //AudioName: this.targetGrps.targetGrpArr[i].audioList.map((audio: any) => audio.name),
        AudioName: [],
        Country: this.targetGrps.targetGrpArr[i].country,
        State: this.targetGrps.targetGrpArr[i].state,
        AgeGrp: `${this.targetGrps.targetGrpArr[i].minAge} - ${this.targetGrps.targetGrpArr[i].maxAge}`,
        //CompetetionProduct: this.targetGrps.targetGrpArr[i].competitors,
        CompetetionProduct: this.targetGrps.targetGrpArr[i].competitors.map((comp: any) => comp.name),
        MaricoProduct: this.targetGrps.targetGrpArr[i].maricoProduct,
        MainLang: this.targetGrps.targetGrpArr[i].primaryLang,
        SecondaryLang: this.targetGrps.targetGrpArr[i].otherLangs,
        noOfSpek: this.targetGrps.targetGrpArr[i].numSpeakers,
        filePath: ""
      }
      const renamedFiles: string[] = [];
      for (let j = 0; j < this.targetGrps.targetGrpArr[i].audioList.length; j++) {
        const originalExtension = this.targetGrps.targetGrpArr[i].audioList[j].data.name.substring(this.targetGrps.targetGrpArr[i].audioList[j].data.name.lastIndexOf('.'));
        const count = j + 1;
        const renamedFile = new File([this.targetGrps.targetGrpArr[i].audioList[j].data], `${this.targetGrps.targetGrpArr[i].name}_${count}${originalExtension}`, { type: this.targetGrps.targetGrpArr[i].audioList[j].data.type });
        renamedFiles.push(renamedFile.name)
        formData.append('files', renamedFile);
      }
      temp.AudioName = renamedFiles;
      TargetGrp.push(temp)
      tgArr.push(this.targetGrps.targetGrpArr[i].name);
    }
    Project["TGIds"] = tgArr;
    formData.append('Project', JSON.stringify(Project));
    formData.append('TargetGrp', JSON.stringify(TargetGrp));
    this.isLoading = true;
    return false;
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
    if (this.currentStep === 0) {
      this.targetGrps = { targetGrpArr: this.targetGrpArr };
    }
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep === 2) {
      this.currentStep = this.currentStep - 2;
    } else if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  ClearProject() {
    this.targetGrpArr = [];
    this.targetForm.reset();
    this.targetForm.controls['projectName'].enable();
    this.currentStep = 4;
  }

  ClearMedia() {
    this.audioFiles = [];
    this.selectedArr = [];
    this.expansionArr = [];
    this.targetGrps = { targetGrpArr: [] };
  }

  AddAnotherProject() {
    this.currentStep = 0;
    this.getExistingProject();
  }

  closeAudioProcess() {
    this.router.navigate(['/portal/dashboard'])
  }

  editAudio(template: TemplateRef<any>, file: any, i: number, j: number) {
    this.editFileName = file.name;
    this.transIndex = i;
    this.audioIndex = j;
    const formData = new FormData();
    formData.append('files', file.data, file.data.name);
    this.isEditPlayerLoad = true;
    this.dialogRef = this.dialog.open(template, {
      width: '70%',
      disableClose: true,
    });
    
    this.dialogRef.afterOpened().subscribe(() => {
      this.audioServ.postAPI('audio/upload-and-peaks', formData).subscribe((res: any) => {
        this.isEditPlayerLoad = false;
        this.url = res.files;
    
        setTimeout(() => this.createWave(), 50); // Ensure DOM is rendered
      }, (err: any) => {
        this.isEditPlayerLoad = false;
        this.toastr.error('Something Went Wrong!');
      });
    });
  }

  createWave() {
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
      this.regionArr = [];
      this.waveformContainer.nativeElement.innerHTML = '';
    }

    const waveformDiv = this.renderer.createElement('div');
    this.renderer.setAttribute(waveformDiv, 'id', 'waveform');
    this.renderer.appendChild(this.waveformContainer.nativeElement, waveformDiv);

    // Initialize WaveSurfer with the new div container
    this.wavesurfer = WaveSurfer.create({
      container: waveformDiv,
      waveColor: '#D4E5F7',
      progressColor: '#014FA1',
      backend: 'MediaElement',
      plugins: [this.regions, this.hoverPlugin],
      height: 60,
      url: this.url[0].fileUrl,
      peaks: this.url[0].peaks
    });
    this.wavesurfer.on('decode', () => {
      this.totalTime = this.wavesurfer.getDuration();
      this.regions.enableDragSelection({
        color: 'rgba(0, 255, 26, 0.3)',
      });

      this.regions.on('region-in', (region) => {
        this.activeRegion = region
      });

      this.regions.on('region-created', (region) => {
        this.regionArr = this.regions.getRegions();
      });

      this.regions.on('region-out', (region) => {
        if (this.activeRegion === region) {
          if (this.loop) {
            region.play();
          } else {
            this.activeRegion = null;
          }
        }
      });

      this.regions.on('region-clicked', (region, e) => {
        e.stopPropagation() // prevent triggering a click on the waveform
        this.activeRegion = region;
        region.play();
      });

      this.wavesurfer.on('timeupdate', (currentTime) => {
        this.currentTime = currentTime;
      });
    });

  }

  playAudio(): void {
    if (this.wavesurfer) {
      if (!this.isAudioPlay) {
        this.wavesurfer.play();
        this.isAudioPlay = !this.isAudioPlay;
      } else {
        this.wavesurfer.pause();
        this.isAudioPlay = !this.isAudioPlay;
      }
    }
  }

  async mergeAudio() {
    if (this.regionArr.length === 0) {
      this.toastr.warning('Please select part of the Audio');
      return false;
    }
    this.isEditPlayerLoad = true;
    const fileRes = await this.urlToFile(this.url[0].fileUrl);
    let filteredRegions = this.regionArr.map(({ start, end }) => ({ start, end }));

    const formData = new FormData();
    formData.append('files', fileRes, fileRes.name);
    formData.append('fileTrimPairs', JSON.stringify(filteredRegions));
    this.audioServ.postAPIBinaryData('audio/merge-with-trims', formData).subscribe(
      (res: Blob) => {
        this.isEditPlayerLoad = false;
        this.createFileFormate(res);

        this.audioUrlFinal = URL.createObjectURL(res);
      },
      (err: any) => {
        this.isEditPlayerLoad = false;
        this.toastr.error('Something went wrong while processing the file.');
      }
    );
    return true;
  }

  urlToFile(url: string): Promise<File> {
    return fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const name = url.split('/').pop() || 'file';
        return new File([blob], name, { type: blob.type });
      });
  }

  createFileFormate(mergedBlob: Blob) {
    this.mergedFile = new File([mergedBlob], 'merged-audio.mp3', { type: 'audio/mpeg' });
  }

  togglePlayPauseFinal(): void {
    if (!this.audioPlayerFinal) {
      console.error('Audio player is not initialized.');
      return;
    }

    const audio = this.audioPlayerFinal.nativeElement;
    if (audio.paused) {
      if (this.currentTimeFinal === '0:00') {
        audio.load();
      }
      audio.play();
      this.isPlayingFinal = true;
    } else {
      audio.pause();
      this.isPlayingFinal = false;
    }
  }
  updateProgressFinal(event: any): void {
    const audio = this.audioPlayerFinal.nativeElement;
    const currentTime = audio.currentTime;
    const duration = audio.duration;
    if (!isNaN(duration)) {
      // Calculate percentage for the seek bar
      this.seekValueFinal = (currentTime / duration) * 100;

      // Update the displayed time
      this.currentTimeFinal = this.formatTime(currentTime);
      this.durationTimeFinal = this.formatTime(duration);

      // Update slider track color
      this.updateSliderTrackFinal();
    }
  }

  updateSliderTrackFinal(): void {
    const slider = document.querySelector('.seek-bar') as HTMLInputElement;
    if (slider) {
      const value = (this.seekValueFinal / 100) * slider.offsetWidth;
      slider.style.background = `linear-gradient(to right, #007bff ${this.seekValueFinal}%, #d3d3d3 ${this.seekValueFinal}%)`;
    }
  }

  seekAudioFinal(event: any): void {
    const audio = this.audioPlayerFinal.nativeElement;
    const newTime = (event.target.value / 100) * audio.duration;
    audio.currentTime = newTime;
  }

  // // Seek forward by 10 seconds
  seekForward(): void {
    const audio = this.audioPlayerFinal.nativeElement;
    audio.currentTime = Math.min(audio.currentTime + 10, audio.duration); // Ensure it doesn't go beyond duration
  }

  // Seek backward by 10 seconds
  seekBackward(): void {
    const audio = this.audioPlayerFinal.nativeElement;
    audio.currentTime = Math.max(audio.currentTime - 10, 0); // Ensure it doesn't go below 0
  }

  closeEditPlayer() {
    if(!this.isEditPlayerLoad){
      this.dialogRef.close();
      this.audioUrlFinal = '';
    }
  }

  replaceAudio() {
    this.targetGrps.targetGrpArr[this.transIndex].audioList[this.audioIndex].data = this.mergedFile;
    this.closeEditPlayer()
  }

}
