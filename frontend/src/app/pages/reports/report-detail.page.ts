import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Photo, Report, ReportStatus } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReportService } from '../../core/services/report.service';
import { errorMessage } from '../../core/utils/http';
import { label } from '../../core/utils/labels';
import { createLoader } from '../../core/utils/loader';
import { EventCardComponent } from '../../shared/components/cards.component';
import { ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { ImageUploaderComponent } from '../../shared/components/image-uploader.component';
import { MapViewComponent } from '../../shared/components/map-view.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { StatusTimelineComponent } from '../../shared/components/status-timeline.component';
import { LabelPipe, ThumbPipe } from '../../shared/pipes/pipes';

const TRANSITION_UI: Record<ReportStatus, { label: string; icon: string; style: string }> = {
  VERIFIED: { label: 'Verify report', icon: 'shield-check', style: 'btn btn-primary' },
  REJECTED: { label: 'Reject', icon: 'circle-x', style: 'btn btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700' },
  CLEANING_SCHEDULED: { label: 'Mark cleaning scheduled', icon: 'calendar-check', style: 'btn btn-secondary' },
  IN_PROGRESS: { label: 'Mark in progress', icon: 'play', style: 'btn btn-secondary' },
  COMPLETED: { label: 'Mark completed', icon: 'circle-check', style: 'btn btn-dark' },
  CANCELLED: { label: 'Withdraw report', icon: 'ban', style: 'btn btn-ghost text-red-600 hover:bg-red-50' },
  PENDING: { label: 'Reopen', icon: 'refresh-cw', style: 'btn btn-secondary' },
};

@Component({
  selector: 'app-report-detail-page',
  imports: [DatePipe, RouterLink, LucideAngularModule, StatusBadgeComponent, StatusTimelineComponent, MapViewComponent,
    EventCardComponent, ImageUploaderComponent, LoadingSpinnerComponent, ErrorStateComponent, LabelPipe, ThumbPipe],
  template: `
    <a [routerLink]="backLink()" class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900">
      <lucide-icon name="arrow-left" [size]="15" aria-hidden="true" /> {{ auth.hasRole('ADMIN') ? 'All reports' : 'Reports' }}
    </a>

    @if (state.loading() && !state.data()) {
      <app-loading-spinner label="Loading report…" />
    } @else if (state.error()) {
      <app-error-state [message]="state.error()" (retry)="state.load()" />
    } @else if (state.data(); as report) {
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <article class="card card-body">
            <div class="flex flex-wrap items-center gap-2">
              <app-status-badge [value]="report.status" />
              <app-status-badge [value]="report.urgency" prefix="Urgency: " />
              <span class="chip bg-gray-50 text-gray-700 ring-gray-200"><lucide-icon name="recycle" [size]="13" aria-hidden="true" />{{ report.wasteType | label }}</span>
            </div>
            <h1 class="mt-3 text-2xl font-bold sm:text-3xl">{{ report.title }}</h1>
            <p class="mt-1 text-sm text-gray-500">
              Reported by <span class="font-medium text-gray-700">{{ report.reporter.name }}</span> on {{ report.createdDate | date: 'medium' }}
              · Report #{{ report.id }}
            </p>
            <p class="mt-5 whitespace-pre-line text-gray-700">{{ report.description }}</p>

            @if (report.adminComment && (report.status === 'REJECTED' || auth.hasRole('ADMIN'))) {
              <p class="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600"><span class="font-semibold">Moderator note:</span> {{ report.adminComment }}</p>
            }

            <h2 class="mb-3 mt-6 text-base font-semibold">Photos</h2>
            <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              @for (photo of report.photos; track photo.id) {
                <li class="group relative overflow-hidden rounded-xl bg-gray-100">
                  <a [href]="photo.url" target="_blank" rel="noopener" [attr.aria-label]="'Open photo ' + ($index + 1) + ' in a new tab'">
                    <img [src]="photo.url | thumb: 480 : 360" [alt]="'Photo ' + ($index + 1) + ' of ' + report.title" class="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />
                  </a>
                  @if (report.canEdit && report.photos.length > 1) {
                    <button type="button" class="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-red-600 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
                            (click)="deletePhoto(photo)" aria-label="Delete photo"><lucide-icon name="trash-2" [size]="14" aria-hidden="true" /></button>
                  }
                </li>
              }
            </ul>
            @if (report.canEdit && report.photos.length < 10) {
              <details class="mt-4 rounded-xl border border-gray-100 p-4">
                <summary class="cursor-pointer text-sm font-semibold text-brand-700">Add more photos</summary>
                <div class="mt-3 space-y-3">
                  <app-image-uploader #uploader [(files)]="newPhotos" [max]="10 - report.photos.length" inputId="more-photos" />
                  <button type="button" class="btn btn-primary btn-sm" [disabled]="!newPhotos().length || busy()" (click)="uploadPhotos(report)">
                    <lucide-icon name="upload" [size]="14" aria-hidden="true" /> Upload
                  </button>
                </div>
              </details>
            }
          </article>

          @if (report.cleanupPhotos.length) {
            <section class="card card-body" aria-labelledby="cleanup-photos">
              <h2 id="cleanup-photos" class="mb-3 text-lg font-semibold">Cleanup before & after</h2>
              <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                @for (photo of report.cleanupPhotos; track photo.id) {
                  <li class="relative overflow-hidden rounded-lg">
                    <img [src]="photo.url | thumb: 320 : 240" [alt]="photo.type + ' cleanup photo'" class="aspect-[4/3] w-full object-cover" loading="lazy" />
                    <span class="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                          [class]="photo.type === 'AFTER' ? 'bg-brand-700' : 'bg-gray-900/70'">{{ photo.type }}</span>
                  </li>
                }
              </ul>
            </section>
          }

          <section class="card card-body" aria-labelledby="location-heading">
            <h2 id="location-heading" class="mb-2 text-lg font-semibold">Location</h2>
            <p class="mb-3 flex items-start gap-2 text-sm text-gray-600"><lucide-icon name="map-pin" [size]="16" class="mt-0.5 text-brand-600" aria-hidden="true" />{{ report.location }}</p>
            <app-map-view [markers]="markers()" />
          </section>

          @if (report.relatedEvents.length) {
            <section aria-labelledby="events-heading">
              <h2 id="events-heading" class="mb-3 text-lg font-semibold">Cleanup events for this report</h2>
              <div class="grid gap-4 sm:grid-cols-2">
                @for (event of report.relatedEvents; track event.id) { <app-event-card [event]="event" /> }
              </div>
            </section>
          }
        </div>

        <aside class="space-y-6">
          @if (actions().length || report.canEdit || report.canDelete || canSchedule(report)) {
            <section class="card card-body" aria-labelledby="actions-heading">
              <h2 id="actions-heading" class="text-base font-semibold">{{ auth.hasRole('ADMIN') ? 'Moderation' : 'Actions' }}</h2>
              @if (auth.hasRole('ADMIN') && report.status === 'PENDING') {
                <p class="mt-1 text-xs text-gray-500">Check the photos and location, then verify or reject this report.</p>
              }
              <div class="mt-4 flex flex-col gap-2">
                @for (target of actions(); track target) {
                  <button type="button" [class]="ui[target].style + ' w-full'" (click)="changeStatus(report, target)" [disabled]="busy()">
                    <lucide-icon [name]="ui[target].icon" [size]="16" aria-hidden="true" /> {{ ui[target].label }}
                  </button>
                }
                @if (canSchedule(report)) {
                  <a [routerLink]="'/ngo/events/create'" [queryParams]="{ reportId: report.id }" class="btn btn-primary w-full">
                    <lucide-icon name="calendar-plus" [size]="16" aria-hidden="true" /> Schedule a cleanup event
                  </a>
                }
                @if (report.canEdit) {
                  <a [routerLink]="['/reports', report.id, 'edit']" class="btn btn-secondary w-full">
                    <lucide-icon name="pencil" [size]="16" aria-hidden="true" /> {{ report.status === 'REJECTED' ? 'Edit & resubmit' : 'Edit report' }}
                  </a>
                }
                @if (report.canDelete) {
                  <button type="button" class="btn btn-ghost w-full text-red-600 hover:bg-red-50" (click)="deleteReport(report)" [disabled]="busy()">
                    <lucide-icon name="trash-2" [size]="16" aria-hidden="true" /> Delete report
                  </button>
                }
              </div>
            </section>
          }

          <section class="card card-body" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" class="mb-4 text-base font-semibold">Status timeline</h2>
            <app-status-timeline [status]="report.status" [history]="report.statusHistory" />
          </section>
        </aside>
      </div>
    }
  `,
})
export class ReportDetailPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly reportService = inject(ReportService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly ui = TRANSITION_UI;
  protected readonly state = createLoader(() => this.reportService.get(+this.id()), 'Unable to load this report.');
  protected readonly busy = signal(false);
  protected readonly newPhotos = signal<File[]>([]);
  private readonly uploader = viewChild<ImageUploaderComponent>('uploader');

  /** Scheduling is done by creating an event, so the raw CLEANING_SCHEDULED transition is not offered as a button. */
  protected readonly actions = computed(() =>
    (this.state.data()?.allowedTransitions ?? []).filter((s) => s !== 'CLEANING_SCHEDULED'),
  );

  protected readonly markers = computed(() => {
    const r = this.state.data();
    return r?.latitude != null && r.longitude != null ? [{ lat: +r.latitude, lng: +r.longitude, title: r.title }] : [];
  });

  ngOnInit(): void {
    this.state.load();
  }

  protected backLink(): string {
    return this.auth.hasRole('ADMIN') ? '/admin/reports' : '/reports';
  }

  protected canSchedule(report: Report): boolean {
    return this.auth.hasRole('NGO', 'ADMIN') && (report.status === 'VERIFIED' || report.status === 'CLEANING_SCHEDULED');
  }

  protected async changeStatus(report: Report, target: ReportStatus): Promise<void> {
    const rejecting = target === 'REJECTED';
    const result = await this.confirm.ask({
      title: rejecting ? 'Reject this report?' : target === 'CANCELLED' ? 'Withdraw this report?' : `${TRANSITION_UI[target].label}?`,
      message: rejecting
        ? 'The reporter will be notified with your reason and can edit and resubmit the report.'
        : `The report will move from "${label(report.status)}" to "${label(target)}" and the reporter will be notified.`,
      confirmText: TRANSITION_UI[target].label,
      tone: rejecting || target === 'CANCELLED' ? 'danger' : 'primary',
      inputLabel: rejecting ? 'Reason for rejection' : 'Comment (optional)',
      inputRequired: rejecting,
      inputPlaceholder: rejecting ? 'e.g. Duplicate of report #12, or photos do not show the issue' : '',
    });
    if (!result.confirmed) return;
    this.busy.set(true);
    this.reportService.changeStatus(report.id, target, result.value || undefined).subscribe({
      next: (updated) => {
        this.state.data.set(updated);
        this.busy.set(false);
        this.notifications.success(`Report marked as ${label(target).toLowerCase()}.`);
      },
      error: (err) => this.fail(err),
    });
  }

  protected uploadPhotos(report: Report): void {
    this.busy.set(true);
    this.reportService.addPhotos(report.id, this.newPhotos()).subscribe({
      next: (updated) => {
        this.state.data.set(updated);
        this.uploader()?.reset();
        this.busy.set(false);
        this.notifications.success('Photos uploaded.');
      },
      error: (err) => this.fail(err),
    });
  }

  protected async deletePhoto(photo: Photo): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Delete photo?', message: 'This photo will be permanently removed.', confirmText: 'Delete', tone: 'danger' });
    if (!ok) return;
    this.reportService.deletePhoto(photo.id).subscribe({
      next: () => {
        this.notifications.success('Photo deleted.');
        this.state.load();
      },
      error: (err) => this.fail(err),
    });
  }

  protected async deleteReport(report: Report): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete this report?',
      message: `"${report.title}" and its photos will be permanently deleted.`,
      confirmText: 'Delete report',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(true);
    this.reportService.delete(report.id).subscribe({
      next: () => {
        this.notifications.success('Report deleted.');
        void this.router.navigateByUrl(this.backLink());
      },
      error: (err) => this.fail(err),
    });
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.notifications.error(errorMessage(err));
  }
}
