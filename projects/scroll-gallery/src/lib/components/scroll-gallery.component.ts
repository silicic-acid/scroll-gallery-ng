import { DOCUMENT } from '@angular/common';
import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  HostBinding,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  Renderer2,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { fromEvent, timer, Observable, Subject } from 'rxjs';
import { debounceTime, filter, map } from 'rxjs/operators';
import { SiDragRef } from '../drag-ref';
import { ActivatedPosition, PointerVector } from '../typings';
import { bounceFunctionFactory, BounceFunction } from '../util';
import { ScrollGalleryItemComponent } from './item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'si-scroll-gallery',
  templateUrl: './scroll-gallery.component.html',
  styleUrls: ['./scroll-gallery.component.scss']
})
export class ScrollGalleryComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewInit, AfterContentInit {
  @HostBinding('class.animated') initialized = false;

  /* Gallery items declared by user. */
  @ContentChildren(ScrollGalleryItemComponent) galleryItems: QueryList<
    ScrollGalleryItemComponent
  >;

  @ViewChild('slack', { read: ElementRef }) slackElementRef: ElementRef;
  @ViewChild('track', { read: ElementRef }) trackElementRef: ElementRef;

  /** Gap between two gallery item. */
  @Input() gap: number = 120;

  /** Scale rate when activated. */
  @Input() scaleRate: number = 1.2;

  @Input() activatedItemPosition: ActivatedPosition = 100;
  @Input() bounceRate = 100;
  @Input() transitionSpeed = 200;

  @Output() readonly activatedChanged = new EventEmitter<number>();
  @Output() readonly draggingStarted = new EventEmitter<void>();
  @Output() readonly dragging = new EventEmitter<PointerVector>();
  @Output() readonly draggingEnd = new EventEmitter<void>();

  isDragging = false;
  isTransitioning = false;

  private destroy$ = new Subject<void>();

  /** The `real` translate value assigned to the track element. */
  private displayTranslate: number = 0;
  private activeTranslate = 0;

  /** Always 0 when the component inits, ignoring `activatedItemPosition`. */
  private passiveTranslate = 0;
  private draggingDiff = 0;
  private dragRef: SiDragRef;
  private startOffsets: number[] = [];
  private bounceFunction: BounceFunction = x => x;
  private activatedItemIndex = 0;

  constructor(
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    elementRef: ElementRef,
    // tslint:disable-next-line no-any
    @Inject(DOCUMENT) _document: any
  ) {
    this.dragRef = new SiDragRef(elementRef, _document);

    this.dragRef.dragStart$.subscribe(() => this.startDraggingSequence());
    this.dragRef.dragDelta$
      .pipe(filter(() => this.isDragging))
      .subscribe(p => this.onDraggingSequence(p));
    this.dragRef.dragEnd$.subscribe(() => this.cleanupDraggingSequence());

    // Reposition the track when window resizes.
    fromEvent(window, 'resize')
      .pipe(debounceTime(16))
      .subscribe((e: Event) => {
        this.prepareGallery();
        this.markItemActivated(this.activatedItemIndex);
        this.passiveTranslate = -this.startOffsets[this.activatedItemIndex];
        this.moveTrack(this.getActivatedItemOffset(this.activatedItemIndex));
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { scaleRate } = changes;

    if (scaleRate && !scaleRate.isFirstChange) {
      this.galleryItems.forEach(i => (i.scaleRate = scaleRate.currentValue));
    }
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.dragRef.init();
    this.prepareGallery();
    // Prevent animation when the component does initial rendering.
    Promise.resolve().then(() => {
      this.galleryItems.forEach(i => {
        i.scaleRate = this.scaleRate;
      });
      this.markItemActivated(0);
      this.moveTrack(this.getActivatedItemOffset(this.activatedItemIndex));
      this.initialized = true;
    });
  }

  ngAfterContentInit(): void {}

  ngOnDestroy(): void {
    this.dragRef.dispose();
    this.destroy$.next();
  }

  goTo(index: number, silent: boolean = false): void {
    this.passiveTranslate = -this.startOffsets[index];
    this.moveTrack(this.getActivatedItemForOffset(index));
    this.markItemActivated(index);
  }

  /**
   * Calculate to get the boundary of the scroll-able area.
   *
   * @publicApi
   */
  private prepareGallery(): void {
    let width = 0;
    let lastItemWidth = 0;
    const items = this.galleryItems.toArray();
    const length = items.length;

    this.startOffsets = [];

    items.forEach((item, index) => {
      this.startOffsets.push(width);

      const itemWidth = item.el.clientWidth;

      width += itemWidth + this.gap;

      if (index === length - 1) {
        lastItemWidth = itemWidth;
      }

      this.renderer.setStyle(
        item.el,
        'transform',
        `translate3d(${this.gap * index}px, 0, 0)`
      );
    });

    const trackWidth = width - this.gap;

    this.renderer.setStyle(
      this.trackElementRef.nativeElement,
      'width',
      `${trackWidth}px`
    );

    this.bounceFunction = bounceFunctionFactory(
      0,
      trackWidth - lastItemWidth,
      this.bounceRate
    );
  }

  /**
   * When user starts dragging.
   */
  private startDraggingSequence(): void {
    this.isDragging = true;
    this.draggingDiff = this.displayTranslate - this.passiveTranslate;
    this.galleryItems.forEach(item => {
      item.markCurrentAsActivated(false);
    });

    this.cdr.markForCheck();
  }

  private onDraggingSequence(p: PointerVector): void {
    this.activeTranslate = this.passiveTranslate + p.x;

    this.moveTrack(
      this.bounceFunction(this.activeTranslate) + this.draggingDiff
    );
  }

  private cleanupDraggingSequence(): void {
    this.isDragging = false;
    this.isTransitioning = true;

    const direction =
      this.activeTranslate < this.passiveTranslate ? 'left' : 'right';
    const nearestItemIndex = this.getActivatedItemForOffset(
      this.activeTranslate,
      direction
    );

    this.animateToItemAtIndex(nearestItemIndex).subscribe(ok => {
      this.isTransitioning = false;
      this.passiveTranslate = -this.startOffsets[nearestItemIndex];
      this.markItemActivated(nearestItemIndex);

      this.cdr.markForCheck();
    });

    this.cdr.markForCheck();
  }

  /**
   * Navigate to an item with an animation.
   * @param index The item.
   */
  private animateToItemAtIndex(index: number): Observable<boolean> {
    this.moveTrack(this.getActivatedItemOffset(index));

    return timer(this.transitionSpeed).pipe(map(() => true));
  }

  /**
   * Get offset of the current activated item.
   * @param current The index of the current activated item.
   *
   * @returns Always as a `displayTranslate`.
   */
  private getActivatedItemOffset(current: number): number {
    if (this.startOffsets.length <= current) {
      throw new Error(`Cannot access item at index ${current}`);
    }

    const offset = -this.startOffsets[current];

    if (this.activatedItemPosition === 'center') {
      // When the activated item should be aligned to center;
      const slackWidth = (this.slackElementRef.nativeElement as HTMLElement)
        .clientWidth;
      const itemWidth = this.galleryItems.toArray()[current].el.clientWidth;

      return offset + (slackWidth - itemWidth) / 2;
    } else {
      return offset + this.activatedItemPosition;
    }
  }

  /**
   * It returns the index of the gallery item that is closest to a given offset.
   */
  private getActivatedItemForOffset(
    translate: number,
    direction?: 'left' | 'right'
  ): number {
    const parsedTranslate = -translate;

    const length = this.galleryItems.length;
    let firstFurtherIndex = 0;

    while (
      this.startOffsets[firstFurtherIndex] < parsedTranslate &&
      firstFurtherIndex < length
    ) {
      firstFurtherIndex++;
    }

    if (firstFurtherIndex === 0) {
      return firstFurtherIndex;
    }

    if (firstFurtherIndex === length) {
      return firstFurtherIndex - 1;
    }

    const leftOffset = this.startOffsets[firstFurtherIndex - 1];
    const rightOffset = this.startOffsets[firstFurtherIndex];
    const leftItemWidth = this.galleryItems.toArray()[firstFurtherIndex - 1].el
      .clientWidth;
    const rightItemWidth = this.galleryItems.toArray()[firstFurtherIndex - 1].el
      .clientWidth;

    if (direction === 'left' && parsedTranslate > leftOffset + leftItemWidth) {
      return firstFurtherIndex;
    } else if (
      direction === 'right' &&
      parsedTranslate < rightOffset - rightItemWidth
    ) {
      return firstFurtherIndex - 1;
    } else {
      const toLeft = parsedTranslate - (leftOffset + leftItemWidth);
      const toRight = rightOffset - parsedTranslate;

      return toLeft < toRight ? firstFurtherIndex - 1 : firstFurtherIndex;
    }
  }

  private markItemActivated(index: number): void {
    this.activatedItemIndex = index;

    this.galleryItems.forEach((item, i) => {
      item.markCurrentAsActivated(i === index);
    });

    this.cdr.markForCheck();
  }

  /**
   * Transform the scroll-able area.
   */
  private moveTrack(translate: number): void {
    this.displayTranslate = translate;

    this.renderer.setStyle(
      this.trackElementRef.nativeElement,
      'transform',
      `translate3d(${translate}px, 0, 0)`
    );
  }
}
