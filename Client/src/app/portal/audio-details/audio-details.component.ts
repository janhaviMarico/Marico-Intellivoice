import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { AudioService } from '../service/audio.service';
import { ActivatedRoute, Router } from '@angular/router';

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
  tgId:string = 'IN_MH_DG-NN_PR_5_10_HN_EN-MR_4_test-pranay_1727708204761';
  tgName:string = 'IN_MH_DG-NN_PR_5_10_HN_EN-MR_4_test-pranay_1727708204761'

  isPlaying = false;
  audioDetails : any;
  filePath:string = '';
  isLoading: boolean = true;

  constructor(private audioServ:AudioService, private cdr: ChangeDetectorRef,private activeRoute: ActivatedRoute,
    private router:Router
  ) {

  }

  ngOnInit() {
    this.tgId = this.activeRoute.snapshot.paramMap.get("tgId") ?? "";
    this.tgName = this.activeRoute.snapshot.paramMap.get("tgName") ?? "";
    this.getAudioDetails();
  }

  getAudioDetails() {
    this.audioServ.getDetails('audio/details',this.tgName, this.tgName).subscribe((res:any)=> {
      this.audioDetails = res.data;
      this.filePath = res.data.FilePath;
      this.isLoading = false;
    },(err:any)=> {
      
    })
  }

  ngAfterViewInit(): void {
    // Set initial value for seek bar, if necessary
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
      if(this.currentTime === '0:00') {
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
    this.router.navigate(["portal/allFiles"]);
  }
}
