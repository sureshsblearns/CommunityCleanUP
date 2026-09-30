import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, viewChildren } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { GalleryItem } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { EventService } from '../../core/services/event.service';
import { GalleryService } from '../../core/services/gallery.service';
import { NotificationService } from '../../core/services/notification.service';
import { errorMessage } from '../../core/utils/http';
import { createLoader } from '../../core/utils/loader';
import { BeforeAfterComponent } from '../../shared/components/before-after.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { ImageUploaderComponent } from '../../shared/components/image-uploader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-admin-gallery-page',
  imports: [DatePipe, ReactiveFormsModule, LucideAngularModule, PageHeaderComponent, PaginationComponent, BeforeAfterComponent,
    ImageUploaderComponent, EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Manage gallery" eyebrow="Administration" subtitle="Approve NGO submissions and publish before/after results.">
      <button type="button" class="btn btn-primary" (click)="showForm.set(!showForm())" [attr.aria-expanded]="showForm()">
        <lucide-icon [name]="showForm() ? 'x' : 'plus'" [size]="16" aria-hidden="true" /> {{ showForm() ? 'Close form' : 'Add gallery item' }}
      </button>
    </app-page-header>

    @if (showForm()) {
      <form class="card card-body mb-6 space-y-4" [formGroup]="form" (ngSubmit)="create()" novalidate aria-label="New gallery item">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="g-title">Title</label>
            <input id="g-title" class="input" formControlName="title" maxlength="150" />
            @if (form.controls.title.invalid && form.controls.title.touched) { <p class="field-error">Title must be 3–150 characters.</p> }
          </div>
          <div>
            <label class="label" for="g-event">Related completed event (optional)</label>
            <select id="g-event" class="input" formControlName="eventId">
              <option [ngValue]="null">None</option>
              @for (e of completedEvents.data()?.content ?? []; track e.id) { <option [ngValue]="e.id">{{ e.title }} ({{ e.eventDate | date: 'mediumDate' }})</option> }
            </select>
          </div>
          <div>
            <label class="label" for="g-location">Location</label>
            <input id="g-location" class="input" formControlName="location" maxlength="255" />
          </div>
          <div>
            <label class="label" for="g-date">Completion date</label>
            <input id="g-date" type="date" class="input" formControlName="completionDate" />
          </div>
        </div>
        <div>
          <label class="label" for="g-desc">Description</label>
          <textarea id="g-desc" class="input" rows="2" formControlName="description" maxlength="1000"></textarea>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div><p class="label">Before photo</p><app-image-uploader [(files)]="before" [max]="1" inputId="g-before" [invalid]="missing() && !before().length" /></div>
          <div><p class="label">After photo</p><app-image-uploader [(files)]="after" [max]="1" inputId="g-after" [invalid]="missing() && !after().length" /></div>
        </div>
        @if (missing()) { <p class="field-error">Both a before and an after photo are required.</p> }
        <div class="flex justify-end"><button type="submit" class="btn btn-primary" [disabled]="busy()">Publish item</button></div>
      </form>
    }

    <div class="mb-4 flex gap-1" role="tablist" aria-label="Gallery filter">
      @for (tab of tabs; track tab.value) {
        <button type="button" role="tab" [attr.aria-selected]="filter() === tab.value" (click)="setFilter(tab.value)"
                [class]="filter() === tab.value ? 'btn btn-sm bg-brand-600 text-white' : 'btn btn-sm btn-ghost'">{{ tab.label }}</button>
      }
    </div>

    @if (items.loading() && !items.data()) {
      <app-loading-spinner />
    } @else if (items.error()) {
      <app-error-state [message]="items.error()" (retry)="items.load()" />
    } @else if (items.data()?.content?.length) {
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        @for (item of items.data()!.content; track item.id) {
          <article class="card overflow-hidden">
            <app-before-after [before]="item.beforeImageUrl" [after]="item.afterImageUrl" [title]="item.title" [width]="600" [height]="450" />
            <div class="space-y-2 p-4">
              <div class="flex items-start justify-between gap-2">
                <h2 class="font-semibold">{{ item.title }}</h2>
                <span class="chip shrink-0" [class]="item.approved ? 'chip bg-green-50 text-green-800 ring-green-200' : 'chip bg-amber-50 text-amber-800 ring-amber-200'">
                  <lucide-icon [name]="item.approved ? 'eye' : 'clock'" [size]="12" aria-hidden="true" />{{ item.approved ? 'Public' : 'Pending' }}
                </span>
              </div>
              <p class="text-xs text-gray-500">{{ item.location }} · {{ item.completionDate | date: 'mediumDate' }} · by {{ item.createdByName }}</p>
              <div class="flex flex-wrap gap-2 pt-2">
                <button type="button" [class]="item.approved ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'" (click)="toggleApproval(item)" [disabled]="busy()">
                  {{ item.approved ? 'Hide from public' : 'Approve & publish' }}
                </button>
                <button type="button" class="btn btn-ghost btn-sm text-red-600" (click)="remove(item)" [disabled]="busy()">
                  <lucide-icon name="trash-2" [size]="14" aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          </article>
        }
      </div>
      @if (items.data(); as page) {
        <app-pagination [page]="page.page" [totalPages]="page.totalPages" [totalElements]="page.totalElements" [size]="page.size" (pageChange)="goTo($event)" />
      }
    } @else {
      <app-empty-state icon="image" [title]="filter() === 'pending' ? 'No submissions awaiting approval' : 'No gallery items yet'" />
    }
  `,
})
export class AdminGalleryPage implements OnInit {
  private readonly galleryService = inject(GalleryService);
  private readonly eventService = inject(EventService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly uploaders = viewChildren(ImageUploaderComponent);

  protected readonly tabs = [
    { value: 'all' as const, label: 'All items' },
    { value: 'pending' as const, label: 'Awaiting approval' },
  ];
  protected readonly filter = signal<'all' | 'pending'>('all');
  protected readonly page = signal(0);
  protected readonly busy = signal(false);
  protected readonly showForm = signal(false);
  protected readonly missing = signal(false);
  protected readonly before = signal<File[]>([]);
  protected readonly after = signal<File[]>([]);

  protected readonly items = createLoader(() => this.galleryService.list(this.page(), 9, this.filter()), 'Unable to load the gallery.');
  protected readonly completedEvents = createLoader(() => this.eventService.list({ scope: 'past', status: 'COMPLETED', size: 50 }));

  protected readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    description: [''],
    location: [''],
    completionDate: [new Date().toISOString().slice(0, 10)],
    eventId: [null as number | null],
  });

  ngOnInit(): void {
    this.items.load();
    this.completedEvents.load();
  }

  protected setFilter(filter: 'all' | 'pending'): void {
    this.filter.set(filter);
    this.page.set(0);
    this.items.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.items.load();
  }

  protected create(): void {
    this.missing.set(!this.before().length || !this.after().length);
    if (this.form.invalid || this.missing()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.galleryService
      .create({ title: v.title!, description: v.description || null, location: v.location || null, completionDate: v.completionDate || null,
        eventId: v.eventId, approved: true }, this.before()[0], this.after()[0])
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.showForm.set(false);
          this.form.reset({ completionDate: new Date().toISOString().slice(0, 10), eventId: null });
          this.uploaders().forEach((u) => u.reset());
          this.notifications.success('Gallery item published.');
          this.items.load();
        },
        error: (err) => this.fail(err),
      });
  }

  protected toggleApproval(item: GalleryItem): void {
    this.busy.set(true);
    this.galleryService.setApproval(item.id, !item.approved).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.notifications.success(updated.approved ? 'Published to the public gallery.' : 'Hidden from the public gallery.');
        this.items.load();
      },
      error: (err) => this.fail(err),
    });
  }

  protected async remove(item: GalleryItem): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Delete gallery item?', message: `"${item.title}" will be permanently removed.`, confirmText: 'Delete', tone: 'danger' });
    if (!ok) return;
    this.busy.set(true);
    this.galleryService.delete(item.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.success('Gallery item deleted.');
        this.items.load();
      },
      error: (err) => this.fail(err),
    });
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.notifications.error(errorMessage(err));
  }
}
