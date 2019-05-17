import { ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { PointerVector } from './typings';
import { isTouchEvent } from './util';

export class SiDragRef {
  dragDelta$ = new Subject<PointerVector>();
  dragEnd$ = new Subject<PointerVector>();
  dragStart$ = new Subject<void>();

  private isDragging = false;

  private pointerDelta: PointerVector | null = null;
  private pointerPosition: PointerVector | null = null;

  constructor(private elementRef: ElementRef, private document: Document) {}

  init(): void {
    const el = this.elementRef.nativeElement as HTMLElement;

    el.addEventListener('touchstart', this.pointerDown);
    el.addEventListener('mousedown', this.pointerDown);
  }

  dispose(): void {
    this.dragDelta$.complete();
    this.dragEnd$.complete();
    this.dragStart$.complete();

    const el = this.elementRef.nativeElement;

    el.removeEventListener('touchstart', this.pointerDown);
    el.removeEventListener('mousedown', this.pointerDown);
  }

  private pointerDown = (event: MouseEvent | TouchEvent): void => {
    if (!this.isDragging) {
      const point = isTouchEvent(event)
        ? event.touches[0] || event.changedTouches[0]
        : event;

      this.pointerPosition = { x: point.clientX, y: point.clientY };

      this.document.addEventListener('mousemove', this.pointerMove);
      this.document.addEventListener(
        'touchmove',
        this.pointerMove,
        normalizePassiveListenerOptions({
          passive: false,
          capture: true
        })
      );
      this.document.addEventListener('mouseup', this.pointerUp);
      this.document.addEventListener('touchend', this.pointerUp);
    }
  };

  private pointerMove = (event: MouseEvent | TouchEvent): void => {
    const point = isTouchEvent(event)
      ? event.touches[0] || event.changedTouches[0]
      : event;

    const delta = (this.pointerDelta = {
      x: point.clientX - this.pointerPosition!.x,
      y: point.clientY - this.pointerPosition!.y
    });

    if (Math.abs(delta.x) > 5) {
      if (!this.isDragging) {
        this.dragStart$.next();
        this.isDragging = true;
      }
    }

    if (this.isDragging) {
      if (event.cancelable) {
        event.preventDefault();
      }
      this.dragDelta$.next(delta);
    }
  };

  private pointerUp = (): void => {
    this.isDragging = false;

    this.dragEnd$.next(this.pointerDelta);

    this.document.removeEventListener('mousemove', this.pointerMove);
    this.document.removeEventListener(
      'touchmove',
      this.pointerMove,
      normalizePassiveListenerOptions({
        passive: false,
        capture: true
      })
    );
    this.document.removeEventListener('mouseup', this.pointerUp);
    this.document.removeEventListener('touchend', this.pointerUp);
  };
}

let supportsPassiveEvents: boolean;

export function supportsPassiveEventListeners(): boolean {
  if (supportsPassiveEvents == null && typeof window !== 'undefined') {
    try {
      window.addEventListener(
        'test',
        null!,
        Object.defineProperty({}, 'passive', {
          get: () => (supportsPassiveEvents = true)
        })
      );
    } finally {
      supportsPassiveEvents = supportsPassiveEvents || false;
    }
  }

  return supportsPassiveEvents;
}

export function normalizePassiveListenerOptions(
  options: AddEventListenerOptions
): AddEventListenerOptions | boolean {
  return supportsPassiveEventListeners() ? options : !!options.capture;
}
