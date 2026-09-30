import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

type StatTone = 'green' | 'blue' | 'amber' | 'violet' | 'red' | 'teal' | 'gray';

const TONES: Record<StatTone, string> = {
  green: 'bg-brand-50 text-brand-700',
  blue: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
  red: 'bg-red-50 text-red-700',
  teal: 'bg-teal-50 text-teal-700',
  gray: 'bg-gray-100 text-gray-700',
};

@Component({
  selector: 'app-stat-card',
  imports: [LucideAngularModule, RouterLink, NgTemplateOutlet],
  template: `
    <ng-template #content>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500">{{ label() }}</p>
          <p class="mt-2 font-display text-3xl font-bold text-brand-950">{{ value() }}</p>
          @if (hint()) {
            <p class="mt-1 text-xs text-gray-500">{{ hint() }}</p>
          }
        </div>
        <div [class]="toneClass()">
          <lucide-icon [name]="icon()" [size]="20" aria-hidden="true" />
        </div>
      </div>
    </ng-template>
    @if (link()) {
      <a [routerLink]="link()" class="card card-hover card-body block h-full">
        <ng-container [ngTemplateOutlet]="content" />
      </a>
    } @else {
      <div class="card card-body h-full"><ng-container [ngTemplateOutlet]="content" /></div>
    }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('activity');
  readonly tone = input<StatTone>('green');
  readonly hint = input('');
  readonly link = input<string | null>(null);

  protected readonly toneClass = computed(
    () => 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ' + TONES[this.tone()],
  );
}
