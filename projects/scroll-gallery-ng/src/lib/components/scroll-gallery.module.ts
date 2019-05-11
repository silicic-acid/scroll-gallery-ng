import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ScrollGalleryItemComponent } from './item.component';
import { ScrollGalleryComponent } from './scroll-gallery.component';

@NgModule({
  declarations: [ScrollGalleryComponent, ScrollGalleryItemComponent],
  imports: [CommonModule, RouterModule],
  exports: [ScrollGalleryComponent, ScrollGalleryItemComponent]
})
export class ScrollGalleryModule {}
