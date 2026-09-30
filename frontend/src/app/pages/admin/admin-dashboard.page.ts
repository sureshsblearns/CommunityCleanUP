import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { LabelValue, ReportStatus } from '../../core/models/api.models';
import { AdminService } from '../../core/services/admin.service';
import { ReportService } from '../../core/services/report.service';
import { label } from '../../core/utils/labels';
import { createLoader } from '../../core/utils/loader';
import { ReportCardComponent } from '../../shared/components/cards.component';
import { ChartCardComponent } from '../../shared/components/chart-card.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { MapMarker, MapViewComponent } from '../../shared/components/map-view.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';

/** Marker colors use status meaning (pending = amber, verified/scheduled = blue, active = teal, done = green). */
const MARKER_COLORS: Partial<Record<ReportStatus, string>> = {
  PENDING: '#d97706',
  VERIFIED: '#2563eb',
  CLEANING_SCHEDULED: '#2563eb',
  IN_PROGRESS: '#0d9488',
  COMPLETED: '#059669',
  REJECTED: '#6b7280',
};

export function toChart(values: LabelValue[] | undefined, name: string) {
  const list = values ?? [];
  return { labels: list.map((v) => label(v.label)), series: [{ name, values: list.map((v) => v.value) }] };
}

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [RouterLink, LucideAngularModule, PageHeaderComponent, StatCardComponent, ChartCardComponent, ReportCardComponent,
    MapViewComponent, EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Admin dashboard" eyebrow="Administration" subtitle="Platform-wide overview, calculated live from the database.">
      <a routerLink="/admin/reports" [queryParams]="{ status: 'PENDING' }" class="btn btn-primary">
        <lucide-icon name="shield-check" [size]="16" aria-hidden="true" /> Review pending reports
      </a>
    </app-page-header>

    @if (overview.loading() && !overview.data()) {
      <app-loading-spinner label="Loading analytics…" />
    } @else if (overview.error()) {
      <app-error-state [message]="overview.error()" (retry)="loadAll()" />
    } @else if (overview.data(); as o) {
      <h2 class="sr-only">Key figures</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-stat-card label="Total users" [value]="o.totalUsers" icon="users" [hint]="o.residents + ' residents · ' + o.volunteers + ' volunteers · ' + o.ngos + ' NGOs'" link="/admin/users" />
        <app-stat-card label="Total reports" [value]="o.totalReports" icon="clipboard-list" tone="blue" [hint]="o.completedReports + ' completed'" link="/admin/reports" />
        <app-stat-card label="Pending review" [value]="o.pendingReports" icon="clock" tone="amber" hint="Awaiting verification" link="/admin/reports" />
        <app-stat-card label="Total events" [value]="o.totalEvents" icon="calendar-days" tone="violet" [hint]="o.upcomingEvents + ' upcoming · ' + o.completedEvents + ' completed'" link="/admin/events" />
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-stat-card label="Verified reports" [value]="o.verifiedReports + o.scheduledReports" icon="shield-check" tone="blue" [hint]="o.scheduledReports + ' with a cleanup scheduled'" />
        <app-stat-card label="In-progress cleanups" [value]="o.inProgressReports" icon="sparkles" tone="teal" />
        <app-stat-card label="Participants" [value]="o.totalParticipants" icon="hand-heart" [hint]="o.totalAttendances + ' confirmed attendances'" />
        <app-stat-card label="Points awarded" [value]="o.pointsAwarded" icon="gift" tone="violet" [hint]="o.averageFeedbackRating ? 'Avg. event rating ' + o.averageFeedbackRating + '/5' : 'No ratings yet'" />
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <app-chart-card title="Reports by status" [labels]="reportStatus().labels" [series]="reportStatus().series" categoryLabel="Status" />
        <app-chart-card title="Reports by waste type" [labels]="wasteType().labels" [series]="wasteType().series" categoryLabel="Waste type" />
        <app-chart-card title="Events per month" subtitle="By event date, last 6 months" type="line"
                        [labels]="events.data()?.monthly?.labels ?? []" [series]="monthly(events.data()?.monthly?.series)" categoryLabel="Month" />
        <app-chart-card title="Volunteer participation" subtitle="Registrations vs confirmed attendances per month" type="line"
                        [labels]="volunteers.data()?.participation?.labels ?? []" [series]="monthly(volunteers.data()?.participation?.series)" categoryLabel="Month" />
      </div>

      <section class="card card-body mt-8" aria-labelledby="map-heading">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="map-heading" class="text-base font-semibold">Report locations</h2>
          <p class="text-xs text-gray-500">Click a marker to open the report.</p>
        </div>
        <app-map-view [markers]="markers()" height="22rem" [zoom]="11" />
      </section>

      <section class="mt-8" aria-labelledby="pending-heading">
        <div class="mb-3 flex items-center justify-between">
          <h2 id="pending-heading" class="text-lg font-semibold">Latest pending reports</h2>
          <a routerLink="/admin/reports" class="text-sm font-semibold text-brand-700 hover:underline">Manage reports</a>
        </div>
        @if (pending.data()?.content?.length) {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (report of pending.data()!.content; track report.id) { <app-report-card [report]="report" linkBase="/admin/reports" /> }
          </div>
        } @else if (!pending.loading()) {
          <app-empty-state icon="circle-check" title="All caught up" message="There are no reports waiting for review." />
        }
      </section>
    }
  `,
})
export class AdminDashboardPage implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly reportService = inject(ReportService);

  protected readonly overview = createLoader(() => this.admin.overview(), 'Unable to load analytics.');
  protected readonly reports = createLoader(() => this.admin.reportAnalytics());
  protected readonly events = createLoader(() => this.admin.eventAnalytics());
  protected readonly volunteers = createLoader(() => this.admin.volunteerAnalytics());
  protected readonly pending = createLoader(() => this.reportService.list({ status: 'PENDING', size: 4 }));
  protected readonly points = createLoader(() => this.reportService.mapPoints());

  protected readonly reportStatus = computed(() => toChart(this.reports.data()?.byStatus, 'Reports'));
  protected readonly wasteType = computed(() => toChart(this.reports.data()?.byWasteType, 'Reports'));
  protected readonly markers = computed<MapMarker[]>(() =>
    (this.points.data() ?? []).map((p) => ({
      lat: +p.latitude,
      lng: +p.longitude,
      title: `${p.title} (${label(p.status)})`,
      link: `/admin/reports/${p.id}`,
      color: MARKER_COLORS[p.status] ?? '#6b7280',
    })),
  );

  ngOnInit(): void {
    this.loadAll();
  }

  protected loadAll(): void {
    this.overview.load();
    this.reports.load();
    this.events.load();
    this.volunteers.load();
    this.pending.load();
    this.points.load();
  }

  protected monthly(series: Record<string, number[]> | undefined) {
    return Object.entries(series ?? {}).map(([name, values]) => ({ name, values }));
  }
}
