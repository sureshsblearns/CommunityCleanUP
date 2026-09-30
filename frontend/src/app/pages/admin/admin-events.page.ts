import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { EventStatus, EventSummary } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { EventScope, EventService } from '../../core/services/event.service';
import { NotificationService } from '../../core/services/notification.service';
import { errorMessage } from '../../core/utils/http';
import { EVENT_STATUSES } from '../../core/utils/labels';
import { createLoader } from '../../core/utils/loader';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { Time12Pipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-events-page',
  imports: [DatePipe, FormsModule, RouterLink, LucideAngularModule, PageHeaderComponent, PaginationComponent, StatusBadgeComponent,
    EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent, Time12Pipe],
  template: `
    <app-page-header title="Manage events" eyebrow="Administration" subtitle="Monitor every cleanup, its participants and status.">
      <a routerLink="/ngo/events/create" class="btn btn-primary"><lucide-icon name="calendar-plus" [size]="16" aria-hidden="true" /> Create event</a>
    </app-page-header>

    <div class="card mb-4 grid gap-2 p-3 sm:grid-cols-4">
      <div class="relative sm:col-span-2">
        <label for="q" class="sr-only">Search events</label>
        <lucide-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input id="q" class="input pl-9" placeholder="Search title or location" [(ngModel)]="q" (keyup.enter)="apply()" />
      </div>
      <select class="input" [(ngModel)]="scope" (ngModelChange)="apply()" aria-label="Time range">
        <option value="all">All dates</option>
        <option value="upcoming">Upcoming & active</option>
        <option value="past">Past</option>
      </select>
      <select class="input" [(ngModel)]="status" (ngModelChange)="apply()" aria-label="Status">
        <option value="">All statuses</option>
        @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
      </select>
    </div>

    <div class="card overflow-hidden">
      @if (events.loading() && !events.data()) {
        <app-loading-spinner />
      } @else if (events.error()) {
        <div class="p-5"><app-error-state [message]="events.error()" (retry)="events.load()" /></div>
      } @else if (events.data()?.content?.length) {
        <div class="table-wrap" [class.opacity-60]="events.loading()">
          <table class="table">
            <thead><tr><th scope="col">Event</th><th scope="col" class="hidden md:table-cell">Date</th><th scope="col">Volunteers</th><th scope="col">Status</th><th scope="col" class="text-right">Actions</th></tr></thead>
            <tbody class="divide-y divide-gray-100">
              @for (e of events.data()!.content; track e.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/admin/events', e.id]" class="line-clamp-1 font-medium hover:text-brand-700">{{ e.title }}</a>
                    <p class="line-clamp-1 text-xs text-gray-500">{{ e.organizerName }} · {{ e.location }}</p>
                  </td>
                  <td class="hidden whitespace-nowrap text-xs md:table-cell">{{ e.eventDate | date: 'mediumDate' }} · {{ e.startTime | time12 }}</td>
                  <td class="whitespace-nowrap">{{ e.registeredCount }} / {{ e.volunteersRequired }}</td>
                  <td><app-status-badge [value]="e.status" /></td>
                  <td>
                    <div class="flex justify-end gap-1">
                      <a [routerLink]="['/admin/events', e.id]" class="btn btn-secondary btn-sm">Manage</a>
                      @if (e.status !== 'COMPLETED' && e.status !== 'CANCELLED' && e.status !== 'IN_PROGRESS') {
                        <button type="button" class="btn btn-ghost btn-sm text-red-600" (click)="cancel(e)" [disabled]="busy()" [attr.aria-label]="'Cancel ' + e.title">
                          <lucide-icon name="ban" [size]="14" aria-hidden="true" />
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="p-5"><app-empty-state icon="calendar" title="No events found" message="Try adjusting the filters." /></div>
      }
    </div>
    @if (events.data(); as page) {
      <app-pagination [page]="page.page" [totalPages]="page.totalPages" [totalElements]="page.totalElements" [size]="page.size" (pageChange)="goTo($event)" />
    }
  `,
})
export class AdminEventsPage implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly statuses = EVENT_STATUSES;
  protected q = '';
  protected scope: EventScope = 'all';
  protected status: EventStatus | '' = '';
  protected readonly page = signal(0);
  protected readonly busy = signal(false);
  protected readonly events = createLoader(
    () => this.eventService.list({ scope: this.scope, status: this.status, q: this.q, page: this.page(), size: 10 }),
    'Unable to load events.',
  );

  ngOnInit(): void {
    this.events.load();
  }

  protected apply(): void {
    this.page.set(0);
    this.events.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.events.load();
  }

  protected async cancel(event: EventSummary): Promise<void> {
    const result = await this.confirm.ask({
      title: 'Cancel this event?',
      message: `"${event.title}" will be cancelled and ${event.registeredCount} registered volunteer(s) notified.`,
      confirmText: 'Cancel event',
      tone: 'danger',
      inputLabel: 'Reason (shared with volunteers)',
      inputRequired: true,
    });
    if (!result.confirmed) return;
    this.busy.set(true);
    this.eventService.changeStatus(event.id, 'CANCELLED', result.value).subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.success('Event cancelled.');
        this.events.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.notifications.error(errorMessage(err));
      },
    });
  }
}
