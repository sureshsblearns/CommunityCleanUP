import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ReportStatus, ReportSummary, Urgency, WasteType } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReportService } from '../../core/services/report.service';
import { errorMessage } from '../../core/utils/http';
import { REPORT_STATUSES, URGENCIES, WASTE_TYPES } from '../../core/utils/labels';
import { createLoader } from '../../core/utils/loader';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { LabelPipe, ThumbPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-admin-reports-page',
  imports: [DatePipe, FormsModule, RouterLink, LucideAngularModule, PageHeaderComponent, PaginationComponent, StatusBadgeComponent,
    EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent, LabelPipe, ThumbPipe],
  template: `
    <app-page-header title="Manage reports" eyebrow="Administration" subtitle="Verify new reports, reject invalid ones and follow cleanups to completion." />

    <div class="card mb-4 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="relative lg:col-span-2">
        <label for="q" class="sr-only">Search</label>
        <lucide-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input id="q" class="input pl-9" placeholder="Search title or location" [(ngModel)]="q" (keyup.enter)="apply()" />
      </div>
      <select class="input" [(ngModel)]="statusFilter" (ngModelChange)="apply()" aria-label="Status">
        <option value="">All statuses</option>
        @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
      </select>
      <select class="input" [(ngModel)]="wasteType" (ngModelChange)="apply()" aria-label="Waste type">
        <option value="">All waste types</option>
        @for (w of wasteTypes; track w.value) { <option [value]="w.value">{{ w.label }}</option> }
      </select>
      <select class="input" [(ngModel)]="urgency" (ngModelChange)="apply()" aria-label="Urgency">
        <option value="">Any urgency</option>
        @for (u of urgencies; track u.value) { <option [value]="u.value">{{ u.label }}</option> }
      </select>
    </div>

    <div class="card overflow-hidden">
      @if (reports.loading() && !reports.data()) {
        <app-loading-spinner />
      } @else if (reports.error()) {
        <div class="p-5"><app-error-state [message]="reports.error()" (retry)="reports.load()" /></div>
      } @else if (reports.data()?.content?.length) {
        <div class="table-wrap" [class.opacity-60]="reports.loading()">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">
                  <button type="button" class="inline-flex items-center gap-1 uppercase" (click)="sortBy('title')">Report
                    @if (sort() === 'title') { <lucide-icon name="chevron-down" [size]="12" [class]="direction() === 'asc' ? 'rotate-180' : ''" aria-hidden="true" /> }
                  </button>
                </th>
                <th scope="col" class="hidden lg:table-cell">Type</th>
                <th scope="col"><button type="button" class="inline-flex items-center gap-1 uppercase" (click)="sortBy('urgency')">Urgency
                  @if (sort() === 'urgency') { <lucide-icon name="chevron-down" [size]="12" [class]="direction() === 'asc' ? 'rotate-180' : ''" aria-hidden="true" /> }</button></th>
                <th scope="col">Status</th>
                <th scope="col" class="hidden md:table-cell"><button type="button" class="inline-flex items-center gap-1 uppercase" (click)="sortBy('createdDate')">Submitted
                  @if (sort() === 'createdDate') { <lucide-icon name="chevron-down" [size]="12" [class]="direction() === 'asc' ? 'rotate-180' : ''" aria-hidden="true" /> }</button></th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (r of reports.data()!.content; track r.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      @if (r.thumbnailUrl) { <img [src]="r.thumbnailUrl | thumb: 96 : 96" alt="" class="hidden h-11 w-11 rounded-lg object-cover sm:block" /> }
                      <div class="min-w-0">
                        <a [routerLink]="['/admin/reports', r.id]" class="line-clamp-1 font-medium hover:text-brand-700">{{ r.title }}</a>
                        <p class="line-clamp-1 text-xs text-gray-500">#{{ r.id }} · {{ r.reporterName }} · {{ r.location }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="hidden text-xs lg:table-cell">{{ r.wasteType | label }}</td>
                  <td><app-status-badge [value]="r.urgency" /></td>
                  <td><app-status-badge [value]="r.status" /></td>
                  <td class="hidden whitespace-nowrap text-xs text-gray-500 md:table-cell">{{ r.createdDate | date: 'mediumDate' }}</td>
                  <td>
                    <div class="flex justify-end gap-1">
                      @if (r.status === 'PENDING') {
                        <button type="button" class="btn btn-primary btn-sm" (click)="verify(r)" [disabled]="busy()" [attr.aria-label]="'Verify ' + r.title">
                          <lucide-icon name="check" [size]="14" aria-hidden="true" /><span class="hidden xl:inline">Verify</span>
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm text-red-600" (click)="reject(r)" [disabled]="busy()" [attr.aria-label]="'Reject ' + r.title">
                          <lucide-icon name="x" [size]="14" aria-hidden="true" /><span class="hidden xl:inline">Reject</span>
                        </button>
                      }
                      <a [routerLink]="['/admin/reports', r.id]" class="btn btn-ghost btn-sm" [attr.aria-label]="'Open ' + r.title"><lucide-icon name="eye" [size]="14" aria-hidden="true" /></a>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="p-5"><app-empty-state icon="clipboard-list" title="No reports found" message="Try adjusting the filters." /></div>
      }
    </div>
    @if (reports.data(); as page) {
      <app-pagination [page]="page.page" [totalPages]="page.totalPages" [totalElements]="page.totalElements" [size]="page.size" (pageChange)="goTo($event)" />
    }
  `,
})
export class AdminReportsPage implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  /** Optional ?status= deep link from the dashboard. */
  readonly status = input<string>();

  protected readonly statuses = REPORT_STATUSES;
  protected readonly wasteTypes = WASTE_TYPES;
  protected readonly urgencies = URGENCIES;
  protected q = '';
  protected statusFilter: ReportStatus | '' = '';
  protected wasteType: WasteType | '' = '';
  protected urgency: Urgency | '' = '';
  protected readonly page = signal(0);
  protected readonly sort = signal('createdDate');
  protected readonly direction = signal<'asc' | 'desc'>('desc');
  protected readonly busy = signal(false);

  protected readonly reports = createLoader(
    () =>
      this.reportService.list({
        scope: 'all', q: this.q, status: this.statusFilter, wasteType: this.wasteType, urgency: this.urgency,
        page: this.page(), size: 10, sort: this.sort(), direction: this.direction(),
      }),
    'Unable to load reports. Please try again.',
  );

  ngOnInit(): void {
    const preset = REPORT_STATUSES.find((s) => s.value === this.status());
    if (preset) this.statusFilter = preset.value;
    this.reports.load();
  }

  protected apply(): void {
    this.page.set(0);
    this.reports.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.reports.load();
  }

  protected sortBy(field: string): void {
    if (this.sort() === field) {
      this.direction.set(this.direction() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(field);
      this.direction.set('desc');
    }
    this.reports.load();
  }

  protected verify(report: ReportSummary): void {
    this.update(report, 'VERIFIED', undefined, 'Report verified.');
  }

  protected async reject(report: ReportSummary): Promise<void> {
    const result = await this.confirm.ask({
      title: 'Reject this report?',
      message: `"${report.title}" will be rejected and the reporter notified.`,
      confirmText: 'Reject report',
      tone: 'danger',
      inputLabel: 'Reason for rejection',
      inputRequired: true,
    });
    if (result.confirmed) this.update(report, 'REJECTED', result.value, 'Report rejected.');
  }

  private update(report: ReportSummary, status: ReportStatus, comment: string | undefined, message: string): void {
    this.busy.set(true);
    this.reportService.changeStatus(report.id, status, comment).subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.success(message);
        this.reports.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.notifications.error(errorMessage(err));
      },
    });
  }
}
