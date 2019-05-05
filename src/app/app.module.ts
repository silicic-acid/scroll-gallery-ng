import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { ScrollGalleryModule } from '../../projects/scroll-gallery/src/lib';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ScrollGalleryModule
  ],
  providers: [],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
