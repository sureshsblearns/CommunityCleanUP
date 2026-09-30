import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminBadge, BadgeType, User } from '../../core/models/api.models';
import { AdminService } from '../../core/services/admin.service';
import { BadgeService } from '../../core/services/badge.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { errorMessage } from '../../core/utils/http';
import { createLoader } from '../../core/utils/loader';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-admin-rewards-page',
  imports: [DatePipe, FormsModule, RouterLink, LucideAngularModule, PageHeaderComponent, PaginationComponent, EmptyStateComponent,
    ErrorStateComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Rewards & badges" eyebrow="Administration"
                     subtitle="Points are issued automatically for confirmed attendance (50 per event). Badges can also be awarded manually for special contributions." />

    <section class="card card-body mb-6" aria-labelledby="award-heading">
      <h2 id="award-heading" class="text-base font-semibold">Award a badge</h2>
      <form class="mt-3 grid gap-3 sm:grid-cols-4" (submit)="$event.preventDefault(); award()">
        <div class="sm:col-span-2">
          <label class="label" for="user-search">Volunteer or resident</label>
          <div class="flex gap-2">
            <input id="user-search" class="input" placeholder="Search by name or email" [(ngModel)]="userQuery" name="userQuery" (keyup.enter)="$event.preventDefault(); searchUsers()" />
            <button type="button" class="btn btn-secondary" (click)="searchUsers()"><lucide-icon name="search" [size]="16" aria-hidden="true" /><span class="sr-only">Search</span></button>
          </div>
          @if (candidates().length) {
            <select class="input mt-2" [(ngModel)]="userId" name="userId" aria-label="Select user">
              <option [ngValue]="null">Select a user…</option>
              @for (u of candidates(); track u.id) { <option [ngValue]="u.id">{{ u.name }} ({{ u.email }})</option> }
            </select>
          }
        </div>
        <div>
          <label class="label" for="badge">Badge</label>
          <select id="badge" class="input" [(ngModel)]="badge" name="badge">
            @for (b of catalog.data() ?? []; track b.type) { <option [value]="b.type">{{ b.name }}</option> }
          </select>
        </div>
        <div class="flex items-end">
          <button type="submit" class="btn btn-primary w-full" [disabled]="!userId || busy()"><lucide-icon name="award" [size]="16" aria-hidden="true" /> Award</button>
        </div>
      </form>
    </section>

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="card overflow-hidden" aria-labelledby="badges-heading">
        <h2 id="badges-heading" class="border-b border-gray-100 p-5 text-base font-semibold">Badges awarded</h2>
        @if (badges.loading() && !badges.data()) {
          <app-loading-spinner />
        } @else if (badges.error()) {
          <div class="p-5"><app-error-state [message]="badges.error()" (retry)="badges.load()" /></div>
        } @else if (badges.data()?.content?.length) {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th scope="col">User</th><th scope="col">Badge</th><th scope="col" class="hidden sm:table-cell">Awarded</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
              <tbody class="divide-y divide-gray-100">
                @for (b of badges.data()!.content; track b.id) {
                  <tr>
                    <td class="font-medium">{{ b.userName }}</td>
                    <td>{{ b.name }}</td>
                    <td class="hidden text-xs text-gray-500 sm:table-cell">{{ b.awardedDate | date: 'mediumDate' }}</td>
                    <td class="text-right"><button type="button" class="btn btn-ghost btn-sm text-red-600" (click)="revoke(b)" [attr.aria-label]="'Revoke ' + b.name + ' from ' + b.userName">Revoke</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="px-5 pb-4"><app-pagination [page]="badgePage()" [totalPages]="badges.data()!.totalPages" [totalElements]="badges.data()!.totalElements" [size]="10" (pageChange)="badgePage.set($event); badges.load()" /></div>
        } @else {
          <div class="p-5"><app-empty-state icon="award" title="No badges awarded yet" /></div>
        }
      </section>

      <section class="card overflow-hidden" aria-labelledby="tx-heading">
        <h2 id="tx-heading" class="border-b border-gray-100 p-5 text-base font-semibold">Point transactions</h2>
        @if (transactions.loading() && !transactions.data()) {
          <app-loading-spinner />
        } @else if (transactions.error()) {
          <div class="p-5"><app-error-state [message]="transactions.error()" (retry)="transactions.load()" /></div>
        } @else if (transactions.data()?.content?.length) {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th scope="col">User</th><th scope="col">Event</th><th scope="col" class="text-right">Points</th><th scope="col" class="hidden sm:table-cell">Date</th></tr></thead>
              <tbody class="divide-y divide-gray-100">
                @for (t of transactions.data()!.content; track t.id) {
                  <tr>
                    <td class="font-medium">{{ t.userName }}</td>
                    <td>@if (t.eventId) { <a [routerLink]="['/admin/events', t.eventId]" class="line-clamp-1 hover:text-brand-700">{{ t.eventTitle }}</a> }</td>
                    <td class="text-right font-semibold text-brand-700">+{{ t.points }}</td>
                    <td class="hidden text-xs text-gray-500 sm:table-cell">{{ t.createdAt | date: 'mediumDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="px-5 pb-4"><app-pagination [page]="txPage()" [totalPages]="transactions.data()!.totalPages" [totalElements]="transactions.data()!.totalElements" [size]="10" (pageChange)="txPage.set($event); transactions.load()" /></div>
        } @else {
          <div class="p-5"><app-empty-state icon="gift" title="No points awarded yet" /></div>
        }
      </section>
    </div>
  `,
})
export class AdminRewardsPage implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly badgeService = inject(BadgeService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly badgePage = signal(0);
  protected readonly txPage = signal(0);
  protected readonly busy = signal(false);
  protected readonly candidates = signal<User[]>([]);
  protected userQuery = '';
  protected userId: number | null = null;
  protected badge: BadgeType = 'COMMUNITY_HELPER';

  protected readonly badges = createLoader(() => this.admin.badges(this.badgePage(), 10), 'Unable to load badges.');
  protected readonly transactions = createLoader(() => this.admin.transactions(this.txPage(), 10), 'Unable to load transactions.');
  protected readonly catalog = createLoader(() => this.badgeService.catalog());

  ngOnInit(): void {
    this.badges.load();
    this.transactions.load();
    this.catalog.load();
  }

  protected searchUsers(): void {
    this.userService.list({ q: this.userQuery, size: 20, active: true }).subscribe({
      next: (page) => {
        this.candidates.set(page.content.filter((u) => u.role === 'VOLUNTEER' || u.role === 'RESIDENT'));
        this.userId = this.candidates()[0]?.id ?? null;
        if (!this.candidates().length) this.notifications.info('No volunteers or residents matched your search.');
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }

  protected award(): void {
    if (!this.userId) return;
    this.busy.set(true);
    this.admin.awardBadge(this.userId, this.badge).subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.success('Badge awarded.');
        this.badges.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.notifications.error(errorMessage(err));
      },
    });
  }

  protected async revoke(badge: AdminBadge): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Revoke badge?',
      message: `Remove the "${badge.name}" badge from ${badge.userName}? Automatic badges may be re-awarded after their next attended cleanup.`,
      confirmText: 'Revoke',
      tone: 'danger',
    });
    if (!ok) return;
    this.admin.revokeBadge(badge.id).subscribe({
      next: () => {
        this.notifications.success('Badge revoked.');
        this.badges.load();
      },
      error: (err) => this.notifications.error(errorMessage(err)),
    });
  }
}
