import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportService } from '../../core/services/report.service';
import { createLoader } from '../../core/utils/loader';
import { EventCardComponent, ReportCardComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { Time12Pipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-ngo-dashboard-page',
  imports: [DatePipe, RouterLink, LucideAngularModule, PageHeaderComponent, StatCardComponent, EventCardComponent,
    ReportCardComponent, StatusBadgeComponent, EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent, Time12Pipe],
  template: `
    <app-page-header [title]="organisation()" eyebrow="Organiser dashboard"
                     subtitle="Turn verified reports into cleanup events and manage your volunteers.">
      <a routerLink="/ngo/events/create" class="btn btn-primary"><lucide-icon name="calendar-plus" [size]="16" aria-hidden="true" /> Create event</a>
    </app-page-header>

    @if (dashboard.loading() && !dashboard.data()) {
      <app-loading-spinner label="Loading dashboard…" />
    } @else if (dashboard.error()) {
      <app-error-state [message]="dashboard.error()" (retry)="dashboard.load()" />
    } @else if (dashboard.data(); as d) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-stat-card label="Events created" [value]="d.eventsCreated" icon="calendar-days" />
        <app-stat-card label="Upcoming / active" [value]="d.upcomingEventsCount" icon="calendar-check" tone="blue" />
        <app-stat-card label="Completed events" [value]="d.completedEventsCount" icon="circle-check" tone="teal" />
        <app-stat-card label="Volunteer registrations" [value]="d.totalParticipants" icon="users" tone="violet"
                       [hint]="d.totalAttendances + ' confirmed attendances'" />
      </div>

      <section class="card mt-8" aria-labelledby="my-events">
        <div class="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 id="my-events" class="text-lg font-semibold">My upcoming & active events</h2>
          <a routerLink="/events" [queryParams]="{}" class="text-sm font-semibold text-brand-700 hover:underline">All events</a>
        </div>
        @if (d.upcomingEvents.length) {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th scope="col">Event</th><th scope="col" class="hidden sm:table-cell">When</th><th scope="col">Volunteers</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
              <tbody class="divide-y divide-gray-100">
                @for (e of d.upcomingEvents; track e.id) {
                  <tr>
                    <td><p class="font-medium">{{ e.title }}</p><p class="line-clamp-1 text-xs text-gray-500">{{ e.location }}</p></td>
                    <td class="hidden whitespace-nowrap text-xs sm:table-cell">{{ e.eventDate | date: 'EEE, d MMM' }}<br />{{ e.startTime | time12 }}</td>
                    <td class="whitespace-nowrap">{{ e.registeredCount }} / {{ e.volunteersRequired }}</td>
                    <td><app-status-badge [value]="e.status" /></td>
                    <td class="text-right"><a [routerLink]="['/ngo/events', e.id, 'manage']" class="btn btn-secondary btn-sm">Manage</a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="p-5">
            <app-empty-state icon="calendar-plus" title="No upcoming events" message="Pick a verified report below and schedule a cleanup."
                             ctaLabel="Create event" ctaLink="/ngo/events/create" />
          </div>
        }
      </section>

      <section class="mt-8" aria-labelledby="needs-cleanup">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 id="needs-cleanup" class="text-lg font-semibold">Verified reports awaiting a cleanup</h2>
            <p class="text-sm text-gray-500">Open a report and choose "Schedule a cleanup event".</p>
          </div>
          <a routerLink="/reports" class="text-sm font-semibold text-brand-700 hover:underline">All reports</a>
        </div>
        @if (verified.data()?.content?.length) {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (report of verified.data()!.content; track report.id) { <app-report-card [report]="report" /> }
          </div>
        } @else if (!verified.loading()) {
          <app-empty-state icon="shield-check" title="No verified reports waiting" message="Great news — every verified report already has a cleanup planned." />
        }
      </section>

      @if (d.recentCompletedEvents.length) {
        <section class="mt-8" aria-labelledby="completed">
          <h2 id="completed" class="mb-3 text-lg font-semibold">Recently completed</h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (event of d.recentCompletedEvents.slice(0, 4); track event.id) { <app-event-card [event]="event" [linkBase]="'/events'" /> }
          </div>
        </section>
      }
    }
  `,
})
export class NgoDashboardPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly reportService = inject(ReportService);

  protected readonly dashboard = createLoader(() => this.dashboardService.mine(), 'Unable to load the dashboard.');
  protected readonly verified = createLoader(() => this.reportService.list({ status: 'VERIFIED', size: 4 }));
  protected readonly organisation = computed(() => {
    const user = this.auth.user();
    return user?.organizationName || user?.name || 'Organiser';
  });

  ngOnInit(): void {
    this.dashboard.load();
    this.verified.load();
  }
}
