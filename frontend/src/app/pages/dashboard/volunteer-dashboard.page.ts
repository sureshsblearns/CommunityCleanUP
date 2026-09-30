import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { RewardService } from '../../core/services/reward.service';
import { createLoader } from '../../core/utils/loader';
import { BadgeCardComponent, EventCardComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { ActivityListComponent } from './dashboard-widgets.component';

@Component({
  selector: 'app-volunteer-dashboard-page',
  imports: [RouterLink, LucideAngularModule, PageHeaderComponent, StatCardComponent, EventCardComponent, BadgeCardComponent,
    ActivityListComponent, EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header [title]="'Welcome back, ' + firstName()" eyebrow="Volunteer dashboard"
                     subtitle="Your cleanups, points and achievements in one place.">
      <a routerLink="/events" class="btn btn-primary"><lucide-icon name="hand-heart" [size]="16" aria-hidden="true" /> Find a cleanup</a>
    </app-page-header>

    @if (dashboard.loading() && !dashboard.data()) {
      <app-loading-spinner label="Loading your dashboard…" />
    } @else if (dashboard.error()) {
      <app-error-state [message]="dashboard.error()" (retry)="dashboard.load()" />
    } @else if (dashboard.data(); as d) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <app-stat-card label="Total points" [value]="d.points" icon="gift" tone="violet" link="/rewards" />
        <app-stat-card label="Events joined" [value]="d.eventsJoined" icon="calendar-days" />
        <app-stat-card label="Cleanups completed" [value]="d.eventsAttended" icon="circle-check" tone="teal" />
        <app-stat-card label="Attendance" [value]="attendanceRate() + '%'" icon="user-check" tone="blue" hint="of finished events" />
        <app-stat-card label="Leaderboard rank" [value]="d.leaderboardRank ? '#' + d.leaderboardRank : '—'" icon="trophy" tone="amber" link="/leaderboard" />
        <app-stat-card label="Certificates" [value]="d.certificatesCount" icon="award" link="/certificates" />
      </div>

      @if (rewards.data()?.nextBadge; as next) {
        <section class="card card-body mt-6 flex flex-col gap-4 sm:flex-row sm:items-center" aria-label="Next badge progress">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <lucide-icon name="target" [size]="22" aria-hidden="true" />
          </div>
          <div class="flex-1">
            <p class="text-sm font-semibold">Next badge: {{ next.name }}</p>
            <p class="text-xs text-gray-500">Attend {{ next.required - next.progress }} more cleanup{{ next.required - next.progress === 1 ? '' : 's' }} to unlock it.</p>
            <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" [attr.aria-valuenow]="next.progress"
                 [attr.aria-valuemax]="next.required" [attr.aria-label]="'Progress towards ' + next.name">
              <div class="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" [style.width.%]="(next.progress / next.required) * 100"></div>
            </div>
          </div>
          <p class="font-display text-2xl font-bold text-brand-800">{{ next.progress }}<span class="text-base text-gray-400">/{{ next.required }}</span></p>
        </section>
      }

      <div class="mt-8 grid gap-6 lg:grid-cols-3">
        <section class="lg:col-span-2" aria-labelledby="upcoming">
          <div class="mb-3 flex items-center justify-between">
            <h2 id="upcoming" class="text-lg font-semibold">{{ d.upcomingEventsCount ? 'My upcoming cleanups' : 'Suggested cleanups' }}</h2>
            <a routerLink="/events" class="text-sm font-semibold text-brand-700 hover:underline">Browse all</a>
          </div>
          @if (d.upcomingEvents.length) {
            <div class="grid gap-4 sm:grid-cols-2">
              @for (event of d.upcomingEvents.slice(0, 4); track event.id) { <app-event-card [event]="event" /> }
            </div>
          } @else {
            <app-empty-state icon="calendar" title="No upcoming events" message="Check back soon for new cleanups." />
          }
        </section>
        <app-activity-list [items]="d.recentActivity" />
      </div>

      <section class="mt-8" aria-labelledby="badges">
        <div class="mb-3 flex items-center justify-between">
          <h2 id="badges" class="text-lg font-semibold">Badges & achievements</h2>
          <a routerLink="/rewards" class="text-sm font-semibold text-brand-700 hover:underline">All rewards</a>
        </div>
        @if (rewards.data(); as r) {
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            @for (badge of r.badges; track badge.type) { <app-badge-card [badge]="badge" /> }
          </div>
        }
      </section>

      @if (d.recentCompletedEvents.length) {
        <section class="mt-8" aria-labelledby="completed">
          <h2 id="completed" class="mb-3 text-lg font-semibold">Recently completed cleanups</h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (event of d.recentCompletedEvents.slice(0, 4); track event.id) { <app-event-card [event]="event" /> }
          </div>
        </section>
      }
    }
  `,
})
export class VolunteerDashboardPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly rewardService = inject(RewardService);

  protected readonly dashboard = createLoader(() => this.dashboardService.mine(), 'Unable to load your dashboard.');
  protected readonly rewards = createLoader(() => this.rewardService.mine());
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');

  /** Attended share of events that have already finished (registrations for upcoming events are excluded). */
  protected readonly attendanceRate = computed(() => {
    const d = this.dashboard.data();
    if (!d) return 0;
    const finished = d.eventsJoined - d.upcomingEventsCount;
    return finished > 0 ? Math.round((d.eventsAttended / finished) * 100) : 0;
  });

  ngOnInit(): void {
    this.dashboard.load();
    this.rewards.load();
    this.auth.refresh().subscribe({ error: () => undefined });
  }
}
