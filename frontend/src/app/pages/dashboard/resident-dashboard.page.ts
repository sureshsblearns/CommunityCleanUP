import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { label } from '../../core/utils/labels';
import { createLoader } from '../../core/utils/loader';
import { EventCardComponent, ReportCardComponent } from '../../shared/components/cards.component';
import { ChartCardComponent } from '../../shared/components/chart-card.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { ActivityListComponent } from './dashboard-widgets.component';

@Component({
  selector: 'app-resident-dashboard-page',
  imports: [RouterLink, LucideAngularModule, PageHeaderComponent, StatCardComponent, ReportCardComponent, EventCardComponent,
    ChartCardComponent, ActivityListComponent, EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header [title]="'Hello, ' + firstName() + ' 👋'" eyebrow="Resident dashboard"
                     subtitle="Track your reports and see what's happening in your community.">
      <a routerLink="/reports/create" class="btn btn-primary"><lucide-icon name="megaphone" [size]="16" aria-hidden="true" /> Report an issue</a>
    </app-page-header>

    @if (dashboard.loading() && !dashboard.data()) {
      <app-loading-spinner label="Loading your dashboard…" />
    } @else if (dashboard.error()) {
      <app-error-state [message]="dashboard.error()" (retry)="dashboard.load()" />
    } @else if (dashboard.data(); as d) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <app-stat-card label="Reports submitted" [value]="d.reportsSubmitted" icon="clipboard-list" link="/reports" />
        <app-stat-card label="Reports cleaned" [value]="d.reportsCompleted" icon="circle-check" tone="teal" />
        <app-stat-card label="Awaiting review" [value]="d.reportsPending" icon="clock" tone="amber" />
        <app-stat-card label="Events joined" [value]="d.eventsJoined" icon="calendar-check" tone="blue" link="/events" />
        <app-stat-card label="Points" [value]="d.points" icon="gift" tone="violet" link="/rewards" />
        <app-stat-card label="Badges" [value]="d.badgesCount" icon="award" tone="green" link="/rewards" />
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-3">
        <section class="lg:col-span-2" aria-labelledby="recent-reports">
          <div class="mb-3 flex items-center justify-between">
            <h2 id="recent-reports" class="text-lg font-semibold">My recent reports</h2>
            <a routerLink="/reports" class="text-sm font-semibold text-brand-700 hover:underline">View all</a>
          </div>
          @if (d.recentReports.length) {
            <div class="grid gap-4 sm:grid-cols-2">
              @for (report of d.recentReports.slice(0, 4); track report.id) { <app-report-card [report]="report" /> }
            </div>
          } @else {
            <app-empty-state icon="megaphone" title="No reports yet" message="Seen an unclean public area? Report it in under a minute."
                             ctaLabel="Report an unclean area" ctaLink="/reports/create" />
          }
        </section>
        <div class="space-y-6">
          <app-chart-card title="My reports by status" [labels]="statusLabels()" [series]="statusSeries()" categoryLabel="Status" [height]="200" />
          <app-activity-list [items]="d.recentActivity" />
        </div>
      </div>

      <section class="mt-8" aria-labelledby="upcoming">
        <div class="mb-3 flex items-center justify-between">
          <h2 id="upcoming" class="text-lg font-semibold">{{ d.upcomingEventsCount ? 'My upcoming events' : 'Upcoming cleanups near you' }}</h2>
          <a routerLink="/events" class="text-sm font-semibold text-brand-700 hover:underline">Browse events</a>
        </div>
        @if (d.upcomingEvents.length) {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (event of d.upcomingEvents.slice(0, 4); track event.id) { <app-event-card [event]="event" /> }
          </div>
        } @else {
          <app-empty-state icon="calendar" title="No upcoming events" message="New cleanups are announced regularly." />
        }
      </section>
    }
  `,
})
export class ResidentDashboardPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  protected readonly dashboard = createLoader(() => this.dashboardService.mine(), 'Unable to load your dashboard.');
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  protected readonly statusLabels = computed(() => (this.dashboard.data()?.reportStatusBreakdown ?? []).map((s) => label(s.label)));
  protected readonly statusSeries = computed(() => [
    { name: 'Reports', values: (this.dashboard.data()?.reportStatusBreakdown ?? []).map((s) => s.value) },
  ]);

  ngOnInit(): void {
    this.dashboard.load();
  }
}
