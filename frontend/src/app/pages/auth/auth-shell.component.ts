import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/** Two-column layout shared by authentication pages. */
@Component({
  selector: 'app-auth-shell',
  imports: [LucideAngularModule],
  template: `
    <div class="container-page grid min-h-[calc(100vh-4rem)] items-center gap-10 py-10 lg:grid-cols-2">
      <div class="hidden lg:block">
        <div class="relative overflow-hidden rounded-3xl bg-brand-900 p-10 text-white">
          <img src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=900&q=70&auto=format&fit=crop" alt=""
               class="absolute inset-0 h-full w-full object-cover opacity-20" />
          <div class="relative">
            <lucide-icon name="leaf" [size]="36" class="text-brand-300" aria-hidden="true" />
            <h2 class="mt-6 text-3xl font-bold leading-tight text-white">Report. Organize.<br />Clean. Together.</h2>
            <ul class="mt-8 space-y-4 text-brand-100">
              <li class="flex gap-3"><lucide-icon name="map-pin" [size]="20" class="shrink-0 text-brand-300" aria-hidden="true" /> Report dirty areas with photos and a map pin</li>
              <li class="flex gap-3"><lucide-icon name="calendar-check" [size]="20" class="shrink-0 text-brand-300" aria-hidden="true" /> Join cleanup events organised by local NGOs</li>
              <li class="flex gap-3"><lucide-icon name="trophy" [size]="20" class="shrink-0 text-brand-300" aria-hidden="true" /> Earn points, badges and certificates</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="mx-auto w-full max-w-md">
        <div class="card p-6 sm:p-8">
          <h1 class="text-2xl font-bold">{{ title() }}</h1>
          @if (subtitle()) { <p class="mt-1 text-sm text-gray-500">{{ subtitle() }}</p> }
          <div class="mt-6"><ng-content /></div>
        </div>
      </div>
    </div>
  `,
})
export class AuthShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
