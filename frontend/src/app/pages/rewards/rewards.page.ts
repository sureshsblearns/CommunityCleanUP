import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { RewardService } from '../../core/services/reward.service';
import { createLoader } from '../../core/utils/loader';
import { BadgeCardComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';

@Component({
  selector: 'app-rewards-page',
  imports: [DatePipe, RouterLink, LucideAngularModule, PageHeaderComponent, StatCardComponent, BadgeCardComponent,
    EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="My rewards" eyebrow="Points & badges"
                     subtitle="Points are awarded automatically when an organiser confirms your attendance at a completed cleanup." />

    @if (rewards.loading() && !rewards.data()) {
      <app-loading-spinner />
    } @else if (rewards.error()) {
      <app-error-state [message]="rewards.error()" (retry)="rewards.load()" />
    } @else if (rewards.data(); as r) {
      <div class="grid gap-4 sm:grid-cols-3">
        <app-stat-card label="Total points" [value]="r.totalPoints" icon="gift" tone="violet" [hint]="r.pointsPerAttendance + ' points per attended cleanup'" />
        <app-stat-card label="Leaderboard rank" [value]="r.rank ? '#' + r.rank : '—'" icon="trophy" tone="amber" link="/leaderboard" />
        <app-stat-card label="Cleanups attended" [value]="r.eventsAttended" icon="user-check" tone="teal" />
      </div>

      <section class="mt-8" aria-labelledby="badges-heading">
        <h2 id="badges-heading" class="mb-3 text-lg font-semibold">Badges</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          @for (badge of r.badges; track badge.type) { <app-badge-card [badge]="badge" /> }
        </div>
      </section>

      <section class="card mt-8" aria-labelledby="history-heading">
        <h2 id="history-heading" class="border-b border-gray-100 p-5 text-lg font-semibold">Points history</h2>
        @if (r.transactions.length) {
          <ul class="divide-y divide-gray-100">
            @for (tx of r.transactions; track tx.id) {
              <li class="flex items-center gap-4 px-5 py-3.5">
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700"><lucide-icon name="plus" [size]="16" aria-hidden="true" /></span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium">{{ tx.description }}</p>
                  <p class="text-xs text-gray-500">{{ tx.createdAt | date: 'mediumDate' }}</p>
                </div>
                @if (tx.eventId) { <a [routerLink]="['/events', tx.eventId]" class="hidden text-xs font-semibold text-brand-700 hover:underline sm:inline">View event</a> }
                <span class="font-display text-lg font-bold text-brand-700">+{{ tx.points }}</span>
              </li>
            }
          </ul>
        } @else {
          <div class="p-5">
            <app-empty-state icon="gift" title="No points yet" message="Join a cleanup event — you'll earn points once your attendance is confirmed."
                             ctaLabel="Find a cleanup" ctaLink="/events" />
          </div>
        }
      </section>
    }
  `,
})
export class RewardsPage implements OnInit {
  private readonly rewardService = inject(RewardService);
  protected readonly rewards = createLoader(() => this.rewardService.mine(), 'Unable to load your rewards.');

  ngOnInit(): void {
    this.rewards.load();
  }
}
