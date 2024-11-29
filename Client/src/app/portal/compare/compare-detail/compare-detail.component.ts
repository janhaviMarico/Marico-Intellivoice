import { Component } from '@angular/core';
import { AudioService } from '../../service/audio.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-compare-detail',
  templateUrl: './compare-detail.component.html',
  styleUrls: ['./compare-detail.component.scss']
})
export class CompareDetailComponent {
  items = [
    { title: 'Project 1 Analysis', content: 'Lorem ipsum dolor sit amet...' },
    { title: 'Project 2 Analysis', content: 'Phasellus euismod magna...' },
    { title: 'Project 3 Analysis', content: 'Suspendisse potenti...' },
    { title: 'Project 4 Analysis', content: 'Aenean eu turpis euismod...' },
    { title: 'Project 5 Analysis', content: 'Curabitur nec nunc...' },
    { title: 'Project 6 Analysis', content: 'Vestibulum ante ipsum...' },
  ];
  compareArray:string[] = []
  constructor(private audioServ:AudioService, private router: Router) {}

  ngOnInit() {
    this.audioServ.getCompare().subscribe((res:any) => {
      this.compareArray = res;
    })
  }

  isVisible(index: number): boolean {
    return index >= this.currentIndex && index < this.currentIndex + 2;
  }
  
  currentIndex = 0;
  previousIndex = 0;
  
  next() {
    if (this.currentIndex < this.items.length - 2) {
      this.previousIndex = this.currentIndex;
      this.currentIndex += 2;
    }
  }
  
  prev() {
    if (this.currentIndex > 0) {
      this.previousIndex = this.currentIndex;
      this.currentIndex -= 2;
    }
  }

  backBtn() {
    this.router.navigate(['/portal/comparison'])
  }
  
}
