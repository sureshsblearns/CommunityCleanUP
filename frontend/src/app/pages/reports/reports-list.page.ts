import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ReportStatus, Urgency, WasteType } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { ReportService } from '../../core/services/report.service';
import { REPORT_STATUSES, URGENCIES, WASTE_TYPES } from '../../core/utils/labels';
import { createLoader } from '../../core/utils/loader';
import { ReportCardComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-reports-list-page',
  imports: [FormsModule, RouterLink, LucideAngularModule, ReportCardComponent, EmptyStateComponent, ErrorStateComponent,
    PageHeaderComponent, PaginationComponent],
  template: `
    <app-page-header [title]="scope() === 'mine' ? 'My reports' : 'Community reports'" eyebrow="Dirty area reports"
                     [subtitle]="scope() === 'mine' ? 'Track every area you reported, from review to a completed cleanup.' : 'Verified reports across the community. NGOs can schedule cleanups for these.'">
      @if (canReport()) {
        <a routerLink="/reports/create" class="btn btn-primary"><lucide-icon name="plus" [size]="16" aria-hidden="true" /> Report an issue</a>
      }
    </app-page-header>

    <div class="card mb-6 space-y-3 p-3">
      <div class="flex flex-wrap gap-1" role="tablist" aria-label="Report scope">
        @if (canReport()) {
          <button type="button" role="tab" [attr.aria-selected]="scope() === 'mine'" (click)="setScope('mine')"
                  [class]="scope() === 'mine' ? 'btn btn-sm bg-brand-600 text-white' : 'btn btn-sm btn-ghost'">My reports</button>
        }
        <button type="button" role="tab" [attr.aria-selected]="scope() === 'all'" (click)="setScope('all')"
                [class]="scope() === 'all' ? 'btn btn-sm bg-brand-600 text-white' : 'btn btn-sm btn-ghost'">Community</button>
      </div>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div class="relative">
          <label for="report-search" class="sr-only">Search reports</label>
          <lucide-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input id="report-search" class="input pl-9" placeholder="Search title or location" [(ngModel)]="q" (keyup.enter)="apply()" />
        </div>
        <select class="input" [(ngModel)]="status" (ngModelChange)="apply()" aria-label="Filter by status">
          <option value="">All statuses</option>
          @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
        </select>
        <select class="input" [(ngModel)]="wasteType" (ngModelChange)="apply()" aria-label="Filter by waste type">
          <option value="">All waste types</option>
          @for (w of wasteTypes; track w.value) { <option [value]="w.value">{{ w.label }}</option> }
        </select>
        <select class="input" [(ngModel)]="urgency" (ngModelChange)="apply()" aria-label="Filter by urgency">
          <option value="">Any urgency</option>
          @for (u of urgencies; track u.value) { <option [value]="u.value">{{ u.label }}</option> }
        </select>
      </div>
    </div>

    @if (reports.loading() && !reports.data()) {
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">@for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="skeleton h-72"></div> }</div>
    } @else if (reports.error()) {
      <app-error-state [message]="reports.error()" (retry)="reports.load()" />
    } @else if (reports.data()?.content?.length) {
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" [class.opacity-60]="reports.loading()">
        @for (report of reports.data()!.content; track report.id) { <app-report-card [report]="report" /> }
      </div>
      <app-pagination [page]="page()" [totalPages]="reports.data()!.totalPages" [totalElements]="reports.data()!.totalElements"
                      [size]="9" (pageChange)="goTo($event)" />
    } @else if (scope() === 'mine' && !hasFilters()) {
      <app-empty-state icon="megaphone" title="No reports yet" message="Seen litter or an illegal dump? Let the community know."
                       ctaLabel="Report an unclean area" ctaLink="/reports/create" />
    } @else {
      <app-empty-state icon="search" title="No reports match your filters" message="Try clearing some filters." />
    }
  `,
})
export class ReportsListPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly reportService = inject(ReportService);

  protected readonly statuses = REPORT_STATUSES;
  protected readonly wasteTypes = WASTE_TYPES;
  protected readonly urgencies = URGENCIES;
  protected readonly scope = signal<'mine' | 'all'>(this.auth.hasRole('RESIDENT', 'VOLUNTEER') ? 'mine' : 'all');
  protected readonly page = signal(0);
  protected q = '';
  protected status: ReportStatus | '' = '';
  protected wasteType: WasteType | '' = '';
  protected urgency: Urgency | '' = '';

  protected readonly reports = createLoader(
    () =>
      this.reportService.list({
        scope: this.scope(),
        q: this.q,
        status: this.status,
        wasteType: this.wasteType,
        urgency: this.urgency,
        page: this.page(),
        size: 9,
      }),
    'Unable to load reports. Please try again.',
  );

  ngOnInit(): void {
    this.reports.load();
  }

  protected canReport(): boolean {
    return this.auth.hasRole('RESIDENT', 'VOLUNTEER');
  }

  protected hasFilters(): boolean {
    return !!(this.q || this.status || this.wasteType || this.urgency);
  }

  protected setScope(scope: 'mine' | 'all'): void {
    this.scope.set(scope);
    this.apply();
  }

  protected apply(): void {
    this.page.set(0);
    this.reports.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.reports.load();
  }
}
