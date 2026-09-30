import { Component, computed, inject, OnInit } from '@angular/core';
import { AdminService } from '../../core/services/admin.service';
import { createLoader } from '../../core/utils/loader';
import { ChartCardComponent } from '../../shared/components/chart-card.component';
import { ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { toChart } from './admin-dashboard.page';

@Component({
  selector: 'app-admin-analytics-page',
  imports: [PageHeaderComponent, ChartCardComponent, StatCardComponent, ErrorStateComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Analytics" eyebrow="Administration" subtitle="All figures are aggregated on the server from live data." />

    @if (reports.loading() && !reports.data()) {
      <app-loading-spinner label="Crunching numbers…" />
    } @else if (reports.error()) {
      <app-error-state [message]="reports.error()" (retry)="load()" />
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-stat-card label="Report completion rate" [value]="(reports.data()?.completionRate ?? 0) + '%'" icon="circle-check" tone="teal" hint="Completed ÷ all reports" />
        <app-stat-card label="Attendance rate" [value]="(volunteers.data()?.attendanceRate ?? 0) + '%'" icon="user-check" tone="blue" hint="Attended ÷ registrations" />
        <app-stat-card label="Active volunteers" [value]="volunteers.data()?.activeVolunteers ?? 0" icon="hand-heart" hint="Attended at least one cleanup" />
        <app-stat-card label="Points awarded" [value]="volunteers.data()?.pointsAwarded ?? 0" icon="gift" tone="violet" />
      </div>

      <h2 class="mb-3 mt-8 text-lg font-semibold">Reports</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <app-chart-card title="Reports submitted per month" type="line" [labels]="reports.data()?.monthly?.labels ?? []"
                        [series]="series(reports.data()?.monthly?.series)" categoryLabel="Month" />
        <app-chart-card title="Reports by status" [labels]="chart('status').labels" [series]="chart('status').series" categoryLabel="Status" />
        <app-chart-card title="Reports by waste type" [labels]="chart('waste').labels" [series]="chart('waste').series" categoryLabel="Waste type" />
        <app-chart-card title="Reports by urgency" [labels]="chart('urgency').labels" [series]="chart('urgency').series" categoryLabel="Urgency" />
      </div>

      <h2 class="mb-3 mt-8 text-lg font-semibold">Events & volunteers</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <app-chart-card title="Events by status" [labels]="eventStatus().labels" [series]="eventStatus().series" categoryLabel="Status" />
        <app-chart-card title="Most active organisers" subtitle="Events created" [labels]="organizers().labels" [series]="organizers().series" categoryLabel="Organiser" />
        <app-chart-card title="Volunteer participation" subtitle="Registrations vs attendances per month" type="line"
                        [labels]="volunteers.data()?.participation?.labels ?? []" [series]="series(volunteers.data()?.participation?.series)" categoryLabel="Month" />
        <app-chart-card title="Top volunteers" subtitle="Points" [labels]="topVolunteers().labels" [series]="topVolunteers().series" categoryLabel="Volunteer" />
        <app-chart-card title="Badges awarded" [labels]="badges().labels" [series]="badges().series" categoryLabel="Badge" />
        <app-chart-card title="Events per month" type="line" [labels]="events.data()?.monthly?.labels ?? []"
                        [series]="series(events.data()?.monthly?.series)" categoryLabel="Month" />
      </div>
    }
  `,
})
export class AdminAnalyticsPage implements OnInit {
  private readonly admin = inject(AdminService);
  protected readonly reports = createLoader(() => this.admin.reportAnalytics(), 'Unable to load analytics.');
  protected readonly events = createLoader(() => this.admin.eventAnalytics());
  protected readonly volunteers = createLoader(() => this.admin.volunteerAnalytics());

  private readonly reportCharts = computed(() => ({
    status: toChart(this.reports.data()?.byStatus, 'Reports'),
    waste: toChart(this.reports.data()?.byWasteType, 'Reports'),
    urgency: toChart(this.reports.data()?.byUrgency, 'Reports'),
  }));
  protected readonly eventStatus = computed(() => toChart(this.events.data()?.byStatus, 'Events'));
  protected readonly organizers = computed(() => toChart(this.events.data()?.topOrganizers, 'Events'));
  protected readonly topVolunteers = computed(() => toChart(this.volunteers.data()?.topVolunteers, 'Points'));
  protected readonly badges = computed(() => toChart(this.volunteers.data()?.badgesAwarded, 'Badges'));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.reports.load();
    this.events.load();
    this.volunteers.load();
  }

  protected chart(kind: 'status' | 'waste' | 'urgency') {
    return this.reportCharts()[kind];
  }

  protected series(data: Record<string, number[]> | undefined) {
    return Object.entries(data ?? {}).map(([name, values]) => ({ name, values }));
  }
}
