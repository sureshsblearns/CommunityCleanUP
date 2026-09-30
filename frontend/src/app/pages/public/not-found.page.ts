import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="container-page flex flex-col items-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <lucide-icon name="map" [size]="30" aria-hidden="true" />
      </div>
      <h1 class="mt-6 text-3xl font-bold">Page not found</h1>
      <p class="mt-2 max-w-md text-gray-500">The page you are looking for doesn't exist or may have moved.</p>
      <div class="mt-6 flex gap-3">
        <a routerLink="/" class="btn btn-primary">Go home</a>
        <a routerLink="/events" class="btn btn-secondary">Browse events</a>
      </div>
    </div>
  `,
})
export class NotFoundPage {}
