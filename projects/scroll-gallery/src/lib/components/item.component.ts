import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  Renderer2,
  ViewEncapsulation
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'si-gallery-item',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.scss']
})
export class ScrollGalleryItemComponent {
  @HostBinding('class.activated') isActivated = false;

  el: HTMLElement;

  constructor(
    private renderer2: Renderer2,
    private cdr: ChangeDetectorRef,
    elementRef: ElementRef
  ) {
    this.el = elementRef.nativeElement;
  }

  markCurrentAsActivated(activated: boolean = false): void {
    this.isActivated = activated;

    this.cdr.markForCheck();
  }
}
