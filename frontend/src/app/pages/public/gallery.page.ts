import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { GalleryService } from '../../core/services/gallery.service';
import { createLoader } from '../../core/utils/loader';
import { BeforeAfterComponent } from '../../shared/components/before-after.component';
import { EmptyStateComponent, ErrorStateComponent } from '../../shared/components/feedback-states.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-gallery-page',
  imports: [DatePipe, RouterLink, LucideAngularModule, BeforeAfterComponent, EmptyStateComponent, ErrorStateComponent,
    PaginationComponent, PageHeaderComponent],
  template: `
    <div class="container-page py-10">
      <app-page-header eyebrow="Community gallery" title="Before & after"
                       subtitle="Real results from completed community cleanups. Drag each slider to compare." />

      @if (gallery.loading() && !gallery.data()) {
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">@for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="skeleton aspect-[4/3]"></div> }</div>
      } @else if (gallery.error()) {
        <app-error-state [message]="gallery.error()" (retry)="gallery.load()" />
      } @else if (gallery.data()?.content?.length) {
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          @for (item of gallery.data()!.content; track item.id) {
            <article class="card overflow-hidden">
              <app-before-after [before]="item.beforeImageUrl" [after]="item.afterImageUrl" [title]="item.title" [width]="700" [height]="525" />
              <div class="p-5">
                <h2 class="text-lg font-semibold">{{ item.title }}</h2>
                <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  @if (item.location) {
                    <span class="flex items-center gap-1"><lucide-icon name="map-pin" [size]="14" aria-hidden="true" />{{ item.location }}</span>
                  }
                  @if (item.completionDate) {
                    <span class="flex items-center gap-1"><lucide-icon name="calendar-check" [size]="14" aria-hidden="true" />{{ item.completionDate | date: 'mediumDate' }}</span>
                  }
                </div>
                @if (item.description) { <p class="mt-3 text-sm text-gray-600">{{ item.description }}</p> }
                <div class="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{{ item.createdByName }}</span>
                  @if (item.eventId) {
                    <a [routerLink]="['/events', item.eventId]" class="font-semibold text-brand-700 hover:underline">View event</a>
                  }
                </div>
              </div>
            </article>
          }
        </div>
        <app-pagination [page]="page()" [totalPages]="gallery.data()!.totalPages" [totalElements]="gallery.data()!.totalElements"
                        [size]="9" (pageChange)="goTo($event)" />
      } @else {
        <app-empty-state icon="image" title="No cleanups showcased yet"
                         message="Completed cleanups with before and after photos will appear here." />
      }
    </div>
  `,
})
export class GalleryPage implements OnInit {
  private readonly galleryService = inject(GalleryService);
  protected readonly page = signal(0);
  protected readonly gallery = createLoader(() => this.galleryService.list(this.page(), 9), 'Unable to load the gallery. Please try again.');

  ngOnInit(): void {
    this.gallery.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.gallery.load();
  }
}
