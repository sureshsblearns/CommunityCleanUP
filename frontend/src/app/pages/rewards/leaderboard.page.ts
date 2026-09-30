import { Component, inject, OnInit, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { RewardService } from '../../core/services/reward.service';
import { createLoader } from '../../core/utils/loader';
import { UserAvatarComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { LabelPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-leaderboard-page',
  imports: [LucideAngularModule, PageHeaderComponent, UserAvatarComponent, PaginationComponent, EmptyStateComponent,
    ErrorStateComponent, LoadingSpinnerComponent, LabelPipe],
  template: `
    <app-page-header title="Leaderboard" eyebrow="Community champions"
                     subtitle="Ranked by points earned from confirmed cleanup attendance. Only names and public stats are shown." />

    @if (board.loading() && !board.data()) {
      <app-loading-spinner />
    } @else if (board.error()) {
      <app-error-state [message]="board.error()" (retry)="board.load()" />
    } @else if (board.data()?.content?.length) {
      @if (page() === 0) {
        <div class="mb-6 grid gap-4 sm:grid-cols-3">
          @for (entry of board.data()!.content.slice(0, 3); track entry.userId; let i = $index) {
            <div class="card card-body flex items-center gap-4" [class.ring-2]="entry.currentUser" [class.ring-brand-400]="entry.currentUser">
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-extrabold"
                    [class]="i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'">
                <lucide-icon name="medal" [size]="22" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-gray-500">Rank #{{ entry.rank }}</p>
                <p class="truncate font-semibold">{{ entry.name }}</p>
                <p class="text-sm font-bold text-brand-700">{{ entry.points }} pts</p>
              </div>
            </div>
          }
        </div>
      }
      <div class="card overflow-hidden">
        <div class="table-wrap">
          <table class="table">
            <caption class="sr-only">Volunteer leaderboard</caption>
            <thead><tr><th scope="col" class="w-16">Rank</th><th scope="col">Name</th><th scope="col" class="text-right">Points</th><th scope="col" class="hidden text-right sm:table-cell">Cleanups</th><th scope="col" class="hidden text-right sm:table-cell">Badges</th></tr></thead>
            <tbody class="divide-y divide-gray-100">
              @for (entry of board.data()!.content; track entry.userId) {
                <tr [class.bg-brand-50]="entry.currentUser">
                  <td class="font-display text-base font-bold text-gray-500">#{{ entry.rank }}</td>
                  <td>
                    <div class="flex items-center gap-3">
                      <app-user-avatar [name]="entry.name" [size]="32" />
                      <div>
                        <p class="font-medium">{{ entry.name }} @if (entry.currentUser) { <span class="chip ml-1 bg-brand-100 text-brand-800 ring-brand-200">You</span> }</p>
                        <p class="text-xs text-gray-500">{{ entry.role | label }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="text-right font-display text-base font-bold text-brand-700">{{ entry.points }}</td>
                  <td class="hidden text-right sm:table-cell">{{ entry.completedEvents }}</td>
                  <td class="hidden text-right sm:table-cell">{{ entry.badgeCount }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <app-pagination [page]="page()" [totalPages]="board.data()!.totalPages" [totalElements]="board.data()!.totalElements" [size]="20" (pageChange)="goTo($event)" />
    } @else {
      <app-empty-state icon="trophy" title="The leaderboard is empty" message="Be the first to attend a cleanup and earn points!" ctaLabel="Find a cleanup" ctaLink="/events" />
    }
  `,
})
export class LeaderboardPage implements OnInit {
  private readonly rewardService = inject(RewardService);
  protected readonly page = signal(0);
  protected readonly board = createLoader(() => this.rewardService.leaderboard(this.page(), 20), 'Unable to load the leaderboard.');

  ngOnInit(): void {
    this.board.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.board.load();
  }
}
