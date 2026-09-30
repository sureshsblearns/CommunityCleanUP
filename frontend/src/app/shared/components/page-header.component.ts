import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (backLink()) {
          <a [routerLink]="backLink()" class="mb-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900">
            <lucide-icon name="arrow-left" [size]="15" aria-hidden="true" /> {{ backLabel() }}
          </a>
        }
        @if (eyebrow()) {
          <p class="eyebrow mb-1">{{ eyebrow() }}</p>
        }
        <h1 class="text-2xl font-bold sm:text-3xl">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 max-w-2xl text-sm text-gray-500 sm:text-base">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly eyebrow = input('');
  readonly backLink = input<string | unknown[] | null>(null);
  readonly backLabel = input('Back');
}
