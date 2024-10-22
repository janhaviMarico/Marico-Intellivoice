import { ChangeDetectorRef, Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';
import { AudioService } from '../service/audio.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import {environment} from '../../../environments/environment'

@Component({
  selector: 'app-audio-details',
  templateUrl: './audio-details.component.html',
  styleUrls: ['./audio-details.component.scss']
})
export class AudioDetailsComponent {
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  currentTime: string = '0:00';
  durationTime: string = '0:00';
  seekValue: number = 0;
  tgId: string = '';
  tgName: string = ''

  isPlaying = false;
  audioDetails: any;
  filePath: string = '';
  isLoading: boolean = false;

  question: string = "";
  vectorId: string[] = [];
  chatHistory: any[] = [];
  private messageHistorySub!: Subscription;

  selectedTabIndex: number = 0;

  isEdit: boolean = false;

  currentText: string = '';
  replaceText: string = '';
  tempAudioData: any = [];

  constructor(private audioServ: AudioService, private cdr: ChangeDetectorRef, private activeRoute: ActivatedRoute,
    private router: Router, private toastr: ToastrService, private dialog: MatDialog,
  ) {

  }

  ngOnInit() {
    this.tgId = this.activeRoute.snapshot.paramMap.get("tgId") ?? "";
    this.tgName = this.activeRoute.snapshot.paramMap.get("tgName") ?? "";
    this.getAudioDetails();
    this.messageHistorySub = this.audioServ.getMessageHistory().subscribe((res: any) => {
      if (res) {
        this.chatHistory.push(res);
      }
    })
  }

  getAudioDetails() {
    this.isLoading = true;
    this.audioServ.getDetails('audio/details', this.tgId, this.tgName).subscribe((res: any) => {
      this.audioDetails = res.data;
      this.filePath = res.data.FilePath;
      this.vectorId = res.data.vectorId;
      this.tempAudioData = res.data.AudioData.map((x: any) => Object.assign({}, x));
      this.isLoading = false;
    }, (err: any) => {

    })
  }

  ngAfterViewInit(): void {
    this.seekValue = 0;
  }

  updateProgress(event: any): void {
    const audio = this.audioPlayer.nativeElement;
    const currentTime = audio.currentTime;
    const duration = audio.duration;

    // Calculate percentage for the seek bar
    this.seekValue = (currentTime / duration) * 100;

    // Update the displayed time
    this.currentTime = this.formatTime(currentTime);
    this.durationTime = this.formatTime(duration);

    // Update slider track color
    this.updateSliderTrack();
  }

  seekAudio(event: any): void {
    const audio = this.audioPlayer.nativeElement;
    const newTime = (event.target.value / 100) * audio.duration;
    audio.currentTime = newTime;
  }

  updateSliderTrack(): void {
    const slider = document.querySelector('.seek-bar') as HTMLInputElement;
    if (slider) {
      const value = (this.seekValue / 100) * slider.offsetWidth;
      slider.style.background = `linear-gradient(to right, #007bff ${this.seekValue}%, #d3d3d3 ${this.seekValue}%)`;
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${minutes}:${sec < 10 ? '0' : ''}${sec}`;
  }

  togglePlayPause(): void {
    const audio = this.audioPlayer.nativeElement;
    if (audio.paused) {
      if (this.currentTime === '0:00') {
        audio.load();
      }
      audio.play();
      this.isPlaying = true;
    } else {
      audio.pause();
      this.isPlaying = false;
    }
  }

  // Seek forward by 30 seconds
  seekForward(): void {
    const audio = this.audioPlayer.nativeElement;
    audio.currentTime = Math.min(audio.currentTime + 30, audio.duration); // Ensure it doesn't go beyond duration
  }

  // Seek backward by 10 seconds
  seekBackward(): void {
    const audio = this.audioPlayer.nativeElement;
    audio.currentTime = Math.max(audio.currentTime - 10, 0); // Ensure it doesn't go below 0
  }

  back() {
    this.chatHistory = [];
    if (this.messageHistorySub) {
      this.messageHistorySub.unsubscribe();
    }
    this.router.navigate(["portal/allFiles"]);
  }

  sendQuery() {
    if (this.question !== "") {
      const payload = {
        question: this.question,
        vectorId: this.vectorId
      }
      this.isLoading = true;
      this.audioServ.sendQueryAI('chat/chatVectorId', payload).subscribe((res: any) => {
        this.isLoading = false;
        this.audioServ.messageHistory.next({
          from: 'AI',
          message: res.answer
        });
        this.question = '';
      }, (err: any) => {
        this.isLoading = false;
        this.toastr.error('Something Went Wrong!')
      })
    } else {
      this.toastr.warning('Enter Your Question');
    }
  }

  editTranslation() {
    this.isEdit = true
  }
  cancelEdit() {
    this.audioDetails.AudioData = this.tempAudioData.map((x: any) => Object.assign({}, x));
    this.isEdit = false;
  }
  updateTranslation() {
    this.isLoading = true;
    this.tempAudioData = this.audioDetails.AudioData.map((x: any) => Object.assign({}, x));
    const payload = {
      TGId : this.tgId,
      audiodata: this.tempAudioData
    }
    this.audioServ.postAPI('audio/edit',payload).subscribe((res:any)=> {
      if(res.statusCode === 200) {
        this.toastr.success(res.message);
        this.isLoading = false;
        this.isEdit = false;
      }
    },(err:any)=> {
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!');
    });
  }

  replace(dialogTemplate: TemplateRef<any>) {
    this.dialog.open(dialogTemplate, {
      height: '40vh',
      width: '25vw',
      disableClose: true,
    });
  }

  replaceTextFunct() {
    if (this.replaceText === '') {
      this.toastr.error('Replace Text is Empty')
      return;
    }
    if (this.currentText === '') {
      this.toastr.error('Current Text is Empty')
      return;
    }
    this.isLoading = true;
    const regex = new RegExp(`\\b${this.currentText}\\b`, 'gi');
    this.audioDetails.AudioData.forEach((item: any) => {
      if (item.translation) {
        // Replace the text in the translation key
        item.translation = item.translation.replace(regex, this.replaceText);
      }
    });
    this.tempAudioData = this.audioDetails.AudioData.map((x: any) => Object.assign({}, x));
    const payload = {
      TGId : this.tgId,
      audiodata: this.tempAudioData
    }
    this.audioServ.postAPI('audio/edit',payload).subscribe((res:any)=> {
      if(res.statusCode === 200) {
        this.toastr.success(res.message);
        this.isLoading = false;
        this.currentText = '';
        this.replaceText = '';
      }
    },(err:any)=> {
      this.audioDetails.AudioData = this.tempAudioData.map((x: any) => Object.assign({}, x));
      this.isLoading = false;
      this.toastr.error('Something Went Wrong!');
    })
   
  }

  downloadSummary() {
    const url = `${environment.BASE_URL}transcription/generate-pdf?tgid=${this.tgId}`;
    this.audioServ.getDownload(url);
  }

  isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
  }
}
