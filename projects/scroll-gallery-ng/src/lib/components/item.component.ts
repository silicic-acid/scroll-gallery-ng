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
  templateUrl: './item.component.html'
})
export class ScrollGalleryItemComponent {
  @HostBinding('class.activated') isActivated = false;

  el: HTMLElement;
  scaleRate: number = 1.2;

  constructor(private cdr: ChangeDetectorRef, elementRef: ElementRef) {
    this.el = elementRef.nativeElement;
  }

  markCurrentAsActivated(activated: boolean = false): void {
    this.isActivated = activated;
    this.applyScale();

    this.cdr.markForCheck();
  }

  applyScale(): void {
    const oldTransform = this.el.style.transform;

    let appliedTransform = oldTransform
      .split(/\s/)
      .filter(i => !i.startsWith('scale'))
      .join(' ');

    if (this.isActivated) {
      appliedTransform += `scale(${this.scaleRate})`;
    }

    this.el.style.transform = appliedTransform;
  }
}
