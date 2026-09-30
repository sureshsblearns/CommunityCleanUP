import { Component, input, signal } from '@angular/core';
import { ThumbPipe } from '../pipes/pipes';

/** Draggable before/after comparison. Keyboard accessible through the native range input. */
@Component({
  selector: 'app-before-after',
  imports: [ThumbPipe],
  template: `
    <div class="relative aspect-[4/3] select-none overflow-hidden rounded-xl bg-gray-100">
      <img [src]="after() | thumb: width() : height()" [alt]="'After cleanup: ' + title()" loading="lazy"
           class="absolute inset-0 h-full w-full object-cover" />
      <div class="absolute inset-0 overflow-hidden" [style.clip-path]="'inset(0 ' + (100 - position()) + '% 0 0)'">
        <img [src]="before() | thumb: width() : height()" [alt]="'Before cleanup: ' + title()" loading="lazy"
             class="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div class="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" [style.left.%]="position()">
        <span class="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-800 shadow-lg">⇆</span>
      </div>
      <span class="pointer-events-none absolute left-3 top-3 rounded-md bg-gray-900/75 px-2 py-1 text-xs font-semibold text-white">Before</span>
      <span class="pointer-events-none absolute right-3 top-3 rounded-md bg-brand-700/90 px-2 py-1 text-xs font-semibold text-white">After</span>
      <input type="range" min="0" max="100" [value]="position()" (input)="position.set(+$any($event.target).value)"
             class="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
             [attr.aria-label]="'Compare before and after photos of ' + title()" />
    </div>
  `,
})
export class BeforeAfterComponent {
  readonly before = input.required<string>();
  readonly after = input.required<string>();
  readonly title = input('cleanup');
  readonly width = input(800);
  readonly height = input(600);
  protected readonly position = signal(50);
}
