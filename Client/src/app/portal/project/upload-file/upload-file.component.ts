import { Component, ElementRef, Inject, signal, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { v4 as uuidv4 } from 'uuid';
import { InfoComponent } from '../info/info.component';
import { AddProjectComponent } from '../add-project/add-project.component';

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
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.scss']
})
export class UploadFileComponent {
  readonly panelOpenState = signal(false);
  audioFiles: AudioFile[] = [];
  //@ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  selectedArr: AudioFile[] = []; // Array for selected files
  isPlayingIndex: number | null = null;
  selectedTargetGrp: string = '';
  expansionArr: any[] = [];
  target: any;

  // currentTime: string = '0:00';
  // durationTime: string = '0:00';
  // seekValue: number = 0;

  // isPlaying = false;


  // ngAfterViewInit(): void {
  //   this.seekValue = 0;
  // }

  constructor(
    public uploadDialogRef: MatDialogRef<UploadFileComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public targetGrps: { targetGrpArr: any[] }
  ) { }

  ngOnInit() {

  }

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
    event.preventDefault();  // Prevent the default behavior (opening the file)
    event.stopPropagation();
    // Optionally add some visual feedback like changing the border color
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Optionally remove any visual feedback applied in dragover
  }

  // updateProgress(event: any): void {
  //   const audio = this.audioPlayer.nativeElement;
  //   const currentTime = audio.currentTime;
  //   const duration = audio.duration;

  //   // Calculate percentage for the seek bar
  //   this.seekValue = (currentTime / duration) * 100;

  //   // Update the displayed time
  //   this.currentTime = this.formatTime(currentTime);
  //   this.durationTime = this.formatTime(duration);

  //   // Update slider track color
  //   this.updateSliderTrack();
  // }

  // seekAudio(event: any): void {
  //   const audio = this.audioPlayer.nativeElement;
  //   const newTime = (event.target.value / 100) * audio.duration;
  //   audio.currentTime = newTime;
  // }

  // updateSliderTrack(): void {
  //   const slider = document.querySelector('.seek-bar') as HTMLInputElement;
  //   if (slider) {
  //     const value = (this.seekValue / 100) * slider.offsetWidth;
  //     slider.style.background = `linear-gradient(to right, #007bff ${this.seekValue}%, #d3d3d3 ${this.seekValue}%)`;
  //   }
  // }

  // formatTime(seconds: number): string {
  //   const minutes = Math.floor(seconds / 60);
  //   const sec = Math.floor(seconds % 60);
  //   return `${minutes}:${sec < 10 ? '0' : ''}${sec}`;
  // }

  // togglePlayPause(): void {
  //   const audio = this.audioPlayer.nativeElement;
  //   if (audio.paused) {
  //     audio.play();
  //     this.isPlaying = true;
  //   } else {
  //     audio.pause();
  //     this.isPlaying = false;
  //   }
  // }

  //For one Array
  // togglePlayPause(index: number): void {
  //   if (this.isPlayingIndex !== null && this.isPlayingIndex !== index) {
  //     // Stop the previously playing audio
  //     const prevAudio = document.querySelectorAll('audio')[this.isPlayingIndex] as HTMLAudioElement;
  //     prevAudio.pause();
  //     prevAudio.currentTime = 0;
  //   }

  //   const audio = document.querySelectorAll('audio')[index] as HTMLAudioElement;
  //   if (audio.paused) {
  //     audio.play();
  //     this.isPlayingIndex = index;
  //   } else {
  //     audio.pause();
  //     this.isPlayingIndex = null;
  //   }
  // }
  // updateProgress(event: any, index: number): void {
  //   const audio = event.target;
  //   const currentTime = audio.currentTime;
  //   const duration = audio.duration;

  //   // Update specific audio file's progress and time
  //   this.audioFiles[index].seekValue = (currentTime / duration) * 100;
  //   this.audioFiles[index].currentTime = this.formatTime(currentTime);
  //   this.audioFiles[index].durationTime = this.formatTime(duration);

  //   this.updateSliderTrack(index);
  // }

  // seekAudio(event: any, index: number): void {
  //   const audio = document.querySelectorAll('audio')[index] as HTMLAudioElement;
  //   const newTime = (event.target.value / 100) * audio.duration;
  //   audio.currentTime = newTime;
  // }
  // updateSliderTrack(index: number): void {
  //   const slider = document.querySelectorAll('.seek-bar')[index] as HTMLInputElement;
  //   if (slider) {
  //     const value = (this.audioFiles[index].seekValue ?? 0) / 100 * slider.offsetWidth;
  //     slider.style.background = `linear-gradient(to right, #007bff ${this.audioFiles[index].seekValue}%, #d3d3d3 ${this.audioFiles[index].seekValue}%)`;
  //   }
  // }

  //For multiple array
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
    const selectedValue = event.value; // Name of the selected item
    const selectedIndex = this.targetGrps.targetGrpArr.findIndex(tg => tg.name === selectedValue);
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
    } else {
      console.log('Please Select Audio')
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
    }
  }

  mouseEnter(tg: any) {
    this.target = tg;
  }

  audioProcessing() {
    const formData = new FormData();
    var Project:any;
    var TargetGrp:any = [];
    var tgArr:any[] = [];
    for(let i= 0;i< this.targetGrps.targetGrpArr.length;i++) {
      if(i==0) {
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
      formData.append('files',this.targetGrps.targetGrpArr[i].audioList[0].data);
      TargetGrp.push(temp)
      tgArr.push(this.targetGrps.targetGrpArr[i].name)
    }
    Project["TGIds"] = tgArr;

    formData.append('Project',Project);
    formData.append('TargetGrp',TargetGrp);
    // this.closeProject();
    // this.closeDailog();
    // this.dialog.open(InfoComponent, {
    //   height: '50vh',
    //   width: '40vw',
    //   disableClose: true,
    //   data:  { info: 'Process' }
    // });
  }

  closeProject() {
    this.uploadDialogRef.close();
  }

  closeDailog() {
      this.uploadDialogRef.close();
  }
}
