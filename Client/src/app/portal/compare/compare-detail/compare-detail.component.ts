import { Component } from '@angular/core';

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
  
}
