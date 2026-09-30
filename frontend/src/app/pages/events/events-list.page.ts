import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { EventScope, EventService } from '../../core/services/event.service';
import { createLoader } from '../../core/utils/loader';
import { EventCardComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-events-list-page',
  imports: [FormsModule, RouterLink, LucideAngularModule, EventCardComponent, EmptyStateComponent, ErrorStateComponent,
    PageHeaderComponent, PaginationComponent],
  template: `
    <div class="container-page py-10">
      <app-page-header eyebrow="Get involved" title="Cleanup events"
                       subtitle="Find a cleanup near you and register in one click. Points are awarded when your attendance is confirmed.">
        @if (auth.hasRole('NGO', 'ADMIN')) {
          <a routerLink="/ngo/events/create" class="btn btn-primary"><lucide-icon name="calendar-plus" [size]="16" aria-hidden="true" /> Create event</a>
        }
      </app-page-header>

      <div class="card mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap gap-1" role="tablist" aria-label="Event filter">
          @for (tab of tabs(); track tab.value) {
            <button type="button" role="tab" [attr.aria-selected]="scope() === tab.value" (click)="setScope(tab.value)"
                    [class]="scope() === tab.value ? 'btn btn-sm bg-brand-600 text-white' : 'btn btn-sm btn-ghost'">
              {{ tab.label }}
            </button>
          }
        </div>
        <form class="relative sm:w-72" (submit)="$event.preventDefault(); search()">
          <label for="event-search" class="sr-only">Search events</label>
          <lucide-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input id="event-search" class="input pl-9" placeholder="Search by title or location" [(ngModel)]="query" name="q" (keyup.enter)="search()" />
        </form>
      </div>

      @if (events.loading() && !events.data()) {
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">@for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="skeleton h-80"></div> }</div>
      } @else if (events.error()) {
        <app-error-state [message]="events.error()" (retry)="events.load()" />
      } @else if (events.data()?.content?.length) {
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" [class.opacity-60]="events.loading()">
          @for (event of events.data()!.content; track event.id) { <app-event-card [event]="event" /> }
        </div>
        <app-pagination [page]="page()" [totalPages]="events.data()!.totalPages" [totalElements]="events.data()!.totalElements"
                        [size]="9" (pageChange)="goTo($event)" />
      } @else {
        <app-empty-state icon="calendar" [title]="scope() === 'registered' ? 'You have not registered for any events yet' : 'No events found'"
                         [message]="query ? 'Try a different search term.' : 'New cleanup events are announced regularly. Check back soon!'" />
      }
    </div>
  `,
})
export class EventsListPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);

  protected readonly scope = signal<EventScope>('upcoming');
  protected readonly page = signal(0);
  protected query = '';
  protected readonly events = createLoader(
    () => this.eventService.list({ scope: this.scope(), q: this.query, page: this.page(), size: 9 }),
    'Unable to load events. Please try again.',
  );

  protected tabs(): { value: EventScope; label: string }[] {
    const tabs: { value: EventScope; label: string }[] = [
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'past', label: 'Past' },
      { value: 'all', label: 'All' },
    ];
    if (this.auth.hasRole('VOLUNTEER', 'RESIDENT')) tabs.push({ value: 'registered', label: 'My registrations' });
    if (this.auth.hasRole('NGO', 'ADMIN')) tabs.push({ value: 'mine', label: 'Organised by me' });
    return tabs;
  }

  ngOnInit(): void {
    this.events.load();
  }

  protected setScope(scope: EventScope): void {
    this.scope.set(scope);
    this.page.set(0);
    this.events.load();
  }

  protected search(): void {
    this.page.set(0);
    this.events.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.events.load();
  }
}
