import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Role, User, UserDetail } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { errorMessage } from '../../core/utils/http';
import { ROLES } from '../../core/utils/labels';
import { createLoader } from '../../core/utils/loader';
import { BadgeCardComponent, UserAvatarComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { LabelPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-users-page',
  imports: [DatePipe, FormsModule, LucideAngularModule, PageHeaderComponent, PaginationComponent, UserAvatarComponent,
    BadgeCardComponent, EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent, LabelPipe],
  template: `
    <app-page-header title="Manage users" eyebrow="Administration" subtitle="Search accounts, review participation and activate or deactivate users." />

    <div class="card mb-4 grid gap-2 p-3 sm:grid-cols-4">
      <div class="relative sm:col-span-2">
        <label for="q" class="sr-only">Search users</label>
        <lucide-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input id="q" class="input pl-9" placeholder="Search name, email or organisation" [(ngModel)]="q" (keyup.enter)="apply()" />
      </div>
      <select class="input" [(ngModel)]="role" (ngModelChange)="apply()" aria-label="Filter by role">
        <option value="">All roles</option>
        @for (r of roles; track r.value) { <option [value]="r.value">{{ r.label }}</option> }
      </select>
      <select class="input" [(ngModel)]="active" (ngModelChange)="apply()" aria-label="Filter by status">
        <option value="">Any status</option>
        <option value="true">Active</option>
        <option value="false">Deactivated</option>
      </select>
    </div>

    <div class="card overflow-hidden">
      @if (users.loading() && !users.data()) {
        <app-loading-spinner />
      } @else if (users.error()) {
        <div class="p-5"><app-error-state [message]="users.error()" (retry)="users.load()" /></div>
      } @else if (users.data()?.content?.length) {
        <div class="table-wrap" [class.opacity-60]="users.loading()">
          <table class="table">
            <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col" class="hidden md:table-cell">Phone</th><th scope="col" class="hidden sm:table-cell text-right">Points</th><th scope="col" class="hidden lg:table-cell">Joined</th><th scope="col">Status</th><th scope="col" class="text-right">Actions</th></tr></thead>
            <tbody class="divide-y divide-gray-100">
              @for (u of users.data()!.content; track u.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <app-user-avatar [name]="u.name" [size]="34" />
                      <div class="min-w-0">
                        <p class="font-medium">{{ u.name }} @if (u.id === auth.user()?.id) { <span class="text-xs text-gray-400">(you)</span> }</p>
                        <p class="truncate text-xs text-gray-500">{{ u.email }}@if (u.organizationName) { · {{ u.organizationName }} }</p>
                      </div>
                    </div>
                  </td>
                  <td class="text-xs font-medium">{{ u.role | label }}</td>
                  <td class="hidden text-xs md:table-cell">{{ u.phone }}</td>
                  <td class="hidden text-right sm:table-cell">{{ u.points }}</td>
                  <td class="hidden text-xs text-gray-500 lg:table-cell">{{ u.createdAt | date: 'mediumDate' }}</td>
                  <td>
                    <span class="chip" [class]="u.active ? 'chip bg-green-50 text-green-800 ring-green-200' : 'chip bg-gray-100 text-gray-600 ring-gray-200'">
                      <lucide-icon [name]="u.active ? 'circle-check' : 'ban'" [size]="12" aria-hidden="true" />{{ u.active ? 'Active' : 'Deactivated' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex justify-end gap-1">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="view(u)" [attr.aria-label]="'View ' + u.name"><lucide-icon name="eye" [size]="14" aria-hidden="true" /></button>
                      @if (u.id !== auth.user()?.id) {
                        <button type="button" class="btn btn-sm" [class]="u.active ? 'btn btn-sm btn-secondary text-red-600' : 'btn btn-sm btn-primary'"
                                (click)="toggleActive(u)" [disabled]="busy()">
                          {{ u.active ? 'Deactivate' : 'Activate' }}
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
        <div class="p-5"><app-empty-state icon="users" title="No users found" message="Try a different search or filter." /></div>
      }
    </div>
    @if (users.data(); as page) {
      <app-pagination [page]="page.page" [totalPages]="page.totalPages" [totalElements]="page.totalElements" [size]="page.size" (pageChange)="goTo($event)" />
    }

    @if (selected(); as d) {
      <div class="animate-fade-in fixed inset-0 z-[80] flex justify-end bg-gray-900/40" (click)="selected.set(null)">
        <aside class="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="user-title"
               (click)="$event.stopPropagation()">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <app-user-avatar [name]="d.user.name" [size]="48" />
              <div>
                <h2 id="user-title" class="text-lg font-semibold">{{ d.user.name }}</h2>
                <p class="text-sm text-gray-500">{{ d.user.role | label }} · joined {{ d.user.createdAt | date: 'mediumDate' }}</p>
              </div>
            </div>
            <button type="button" class="btn btn-ghost p-1.5" (click)="selected.set(null)" aria-label="Close"><lucide-icon name="x" [size]="18" aria-hidden="true" /></button>
          </div>
          <dl class="mt-6 space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-gray-500">Email</dt><dd>{{ d.user.email }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Phone</dt><dd>{{ d.user.phone }}</dd></div>
            @if (d.user.organizationName) { <div class="flex justify-between"><dt class="text-gray-500">Organisation</dt><dd>{{ d.user.organizationName }}</dd></div> }
          </dl>
          <div class="mt-6 grid grid-cols-3 gap-3 text-center">
            @for (stat of [
              { label: 'Points', value: d.user.points }, { label: 'Reports', value: d.reportsSubmitted }, { label: 'Joined', value: d.eventsJoined },
              { label: 'Attended', value: d.eventsAttended }, { label: 'Organised', value: d.eventsCreated }, { label: 'Certificates', value: d.certificates }
            ]; track stat.label) {
              <div class="rounded-lg bg-gray-50 p-3"><p class="font-display text-xl font-bold">{{ stat.value }}</p><p class="text-xs text-gray-500">{{ stat.label }}</p></div>
            }
          </div>
          <h3 class="mb-3 mt-6 text-sm font-semibold">Badges</h3>
          @if (d.badges.length) {
            <div class="grid grid-cols-2 gap-3">@for (b of d.badges; track b.type) { <app-badge-card [badge]="b" /> }</div>
          } @else {
            <p class="text-sm text-gray-500">No badges earned yet.</p>
          }
        </aside>
      </div>
    }
  `,
})
export class AdminUsersPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly roles = ROLES;
  protected q = '';
  protected role: Role | '' = '';
  protected active: '' | 'true' | 'false' = '';
  protected readonly page = signal(0);
  protected readonly busy = signal(false);
  protected readonly selected = signal<UserDetail | null>(null);

  protected readonly users = createLoader(
    () =>
      this.userService.list({
        q: this.q,
        role: this.role,
        active: this.active === '' ? '' : this.active === 'true',
        page: this.page(),
        size: 10,
      }),
    'Unable to load users.',
  );

  ngOnInit(): void {
    this.users.load();
  }

  protected apply(): void {
    this.page.set(0);
    this.users.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.users.load();
  }

  protected view(user: User): void {
    this.userService.detail(user.id).subscribe({
      next: (detail) => this.selected.set(detail),
      error: (err) => this.notifications.error(errorMessage(err, 'Unable to load user details.')),
    });
  }

  protected async toggleActive(user: User): Promise<void> {
    if (user.active) {
      const ok = await this.confirm.confirm({
        title: `Deactivate ${user.name}?`,
        message: 'They will be signed out and unable to log in until reactivated. Their reports and history are kept.',
        confirmText: 'Deactivate',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.busy.set(true);
    this.userService.setActive(user.id, !user.active).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.users.data.update((page) => page && { ...page, content: page.content.map((u) => (u.id === updated.id ? updated : u)) });
        this.notifications.success(updated.active ? 'User activated.' : 'User deactivated.');
      },
      error: (err) => {
        this.busy.set(false);
        this.notifications.error(errorMessage(err));
      },
    });
  }
}
