import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioDetailsComponent } from './audio-details.component';

describe('AudioDetailsComponent', () => {
  let component: AudioDetailsComponent;
  let fixture: ComponentFixture<AudioDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AudioDetailsComponent]
    });
    fixture = TestBed.createComponent(AudioDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
