import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioProcessComponent } from './audio-process.component';

describe('AudioProcessComponent', () => {
  let component: AudioProcessComponent;
  let fixture: ComponentFixture<AudioProcessComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AudioProcessComponent]
    });
    fixture = TestBed.createComponent(AudioProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
