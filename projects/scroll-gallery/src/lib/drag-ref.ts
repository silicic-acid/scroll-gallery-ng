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

      this.isDragging = true;
      this.pointerPosition = { x: point.clientX, y: point.clientY };

      this.document.addEventListener('mousemove', this.pointerMove);
      this.document.addEventListener('touchmove', this.pointerMove);
      this.document.addEventListener('mouseup', this.pointerUp);
      this.document.addEventListener('touchend', this.pointerUp);

      this.dragStart$.next();
    }
  };

  private pointerMove = (event: MouseEvent | TouchEvent): void => {
    if (this.isDragging) {
      const point = isTouchEvent(event)
        ? event.touches[0] || event.changedTouches[0]
        : event;

      const delta = (this.pointerDelta = {
        x: point.clientX - this.pointerPosition!.x,
        y: point.clientY - this.pointerPosition!.y
      });

      this.dragDelta$.next(delta);
    }
  };

  private pointerUp = (): void => {
    if (this.isDragging) {
      this.isDragging = false;

      this.dragEnd$.next(this.pointerDelta);
    }
  };
}
