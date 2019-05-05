import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollGalleryComponent } from './scroll-gallery.component';

describe('ScrollGalleryComponent', () => {
  let component: ScrollGalleryComponent;
  let fixture: ComponentFixture<ScrollGalleryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ScrollGalleryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScrollGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
