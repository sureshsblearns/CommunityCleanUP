import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-loading-spinner',
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 py-16 text-brand-700" role="status" aria-live="polite">
      <lucide-icon name="loader" [size]="28" class="animate-spin" aria-hidden="true" />
      <span class="text-sm font-medium text-gray-500">{{ label() }}</span>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  readonly label = input('Loading…');
}

@Component({
  selector: 'app-empty-state',
  imports: [LucideAngularModule, RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-white/60 px-6 py-14 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <lucide-icon [name]="icon()" [size]="26" aria-hidden="true" />
      </div>
      <h3 class="text-lg font-semibold">{{ title() }}</h3>
      @if (message()) {
        <p class="mt-1 max-w-md text-sm text-gray-500">{{ message() }}</p>
      }
      @if (ctaLabel() && ctaLink()) {
        <a [routerLink]="ctaLink()" class="btn btn-primary mt-5">
          <lucide-icon name="plus" [size]="16" aria-hidden="true" /> {{ ctaLabel() }}
        </a>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input('');
  readonly ctaLabel = input('');
  readonly ctaLink = input<string | unknown[]>('');
}

@Component({
  selector: 'app-error-state',
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/60 px-6 py-12 text-center" role="alert">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <lucide-icon name="cloud-off" [size]="22" aria-hidden="true" />
      </div>
      <h3 class="text-base font-semibold text-red-900">{{ title() }}</h3>
      <p class="mt-1 max-w-md text-sm text-red-700">{{ message() }}</p>
      <button type="button" class="btn btn-secondary mt-4" (click)="retry.emit()">
        <lucide-icon name="refresh-cw" [size]="16" aria-hidden="true" /> Try again
      </button>
    </div>
  `,
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input('Unable to load data. Please try again.');
  readonly retry = output<void>();
}
