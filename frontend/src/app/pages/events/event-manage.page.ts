import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CleanupEvent, EventStatus, Participant, PhotoType } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EventService } from '../../core/services/event.service';
import { GalleryService } from '../../core/services/gallery.service';
import { NotificationService } from '../../core/services/notification.service';
import { ParticipantService } from '../../core/services/participant.service';
import { ReportService } from '../../core/services/report.service';
import { errorMessage } from '../../core/utils/http';
import { createLoader } from '../../core/utils/loader';
import { UserAvatarComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { ImageUploaderComponent } from '../../shared/components/image-uploader.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { LabelPipe, ThumbPipe, Time12Pipe } from '../../shared/pipes/pipes';

interface StatusAction {
  status: EventStatus;
  label: string;
  icon: string;
  style: string;
  confirm: { title: string; message: string; tone: 'primary' | 'danger' | 'warning'; input?: boolean };
}

const ACTIONS: Record<string, StatusAction> = {
  OPEN: {
    status: 'OPEN', label: 'Open registrations', icon: 'door-open', style: 'btn btn-primary',
    confirm: { title: 'Open registrations?', message: 'Volunteers will be able to register for this event.', tone: 'primary' },
  },
  IN_PROGRESS: {
    status: 'IN_PROGRESS', label: 'Start event', icon: 'play', style: 'btn btn-primary',
    confirm: { title: 'Start this event?', message: 'Registrations close and you can begin marking attendance. The linked report moves to "In progress".', tone: 'primary' },
  },
  COMPLETED: {
    status: 'COMPLETED', label: 'Complete event', icon: 'circle-check', style: 'btn btn-dark',
    confirm: { title: 'Complete this event?', message: 'Volunteers marked as attended receive 50 points, badges and a certificate. The linked report is marked completed. Make sure attendance is up to date.', tone: 'warning', input: true },
  },
  CANCELLED: {
    status: 'CANCELLED', label: 'Cancel event', icon: 'ban', style: 'btn btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700',
    confirm: { title: 'Cancel this event?', message: 'All registered volunteers will be notified. This cannot be undone.', tone: 'danger', input: true },
  },
};

@Component({
  selector: 'app-event-manage-page',
  imports: [DatePipe, FormsModule, RouterLink, LucideAngularModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent,
    UserAvatarComponent, ImageUploaderComponent, LoadingSpinnerComponent, ErrorStateComponent, EmptyStateComponent, ThumbPipe, Time12Pipe, LabelPipe],
  template: `
    @if (state.loading() && !state.data()) {
      <app-loading-spinner label="Loading event…" />
    } @else if (state.error()) {
      <app-error-state [message]="state.error()" (retry)="reload()" />
    } @else if (state.data(); as event) {
      <app-page-header [title]="event.title" eyebrow="Manage event" [backLink]="backLink()" backLabel="Back"
                       [subtitle]="(event.eventDate | date: 'fullDate') + ' · ' + (event.startTime | time12) + ' · ' + event.location">
        <a [routerLink]="['/events', event.id]" class="btn btn-secondary"><lucide-icon name="eye" [size]="16" aria-hidden="true" /> Public page</a>
        @if (editable(event)) {
          <a [routerLink]="['/ngo/events', event.id, 'edit']" class="btn btn-secondary"><lucide-icon name="pencil" [size]="16" aria-hidden="true" /> Edit</a>
        }
      </app-page-header>

      <div class="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <span class="text-sm text-gray-500">Status</span>
        <app-status-badge [value]="event.status" />
        <div class="ml-auto flex flex-wrap gap-2">
          @for (action of actions(); track action.status) {
            <button type="button" [class]="action.style" (click)="changeStatus(event, action)" [disabled]="busy()">
              <lucide-icon [name]="action.icon" [size]="16" aria-hidden="true" /> {{ action.label }}
            </button>
          }
          @if (event.status === 'COMPLETED') {
            <button type="button" class="btn btn-primary" (click)="publishToGallery(event)" [disabled]="busy()">
              <lucide-icon name="image" [size]="16" aria-hidden="true" /> Add to gallery
            </button>
          }
          @if (canDelete(event)) {
            <button type="button" class="btn btn-ghost text-red-600 hover:bg-red-50" (click)="deleteEvent(event)" [disabled]="busy()">
              <lucide-icon name="trash-2" [size]="16" aria-hidden="true" /> Delete
            </button>
          }
        </div>
      </div>

      <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-stat-card label="Registered" [value]="event.registeredCount" icon="users" />
        <app-stat-card label="Attended" [value]="event.attendedCount" icon="user-check" tone="teal" />
        <app-stat-card label="Capacity" [value]="event.volunteersRequired" icon="target" tone="blue" [hint]="event.remainingSlots + ' slots left'" />
        <app-stat-card label="Linked report" [value]="event.relatedReport ? '#' + event.relatedReport.id : '—'" icon="clipboard-list" tone="violet"
                       [hint]="event.relatedReport ? (event.relatedReport.status | label) : 'Not linked'" [link]="event.relatedReport ? '/reports/' + event.relatedReport.id : null" />
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <section class="card xl:col-span-2" aria-labelledby="participants-heading">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 p-5">
            <div>
              <h2 id="participants-heading" class="text-lg font-semibold">Participants</h2>
              <p class="text-xs text-gray-500">
                @if (attendanceOpen(event)) { Mark who actually showed up. Points are awarded only for confirmed attendance. }
                @else { Attendance can be recorded once the event is started. }
              </p>
            </div>
            @if (attendanceOpen(event) && participants.data()?.length) {
              <button type="button" class="btn btn-secondary btn-sm" (click)="markAll(event)" [disabled]="busy()">
                <lucide-icon name="list-checks" [size]="14" aria-hidden="true" /> Mark all present
              </button>
            }
          </div>
          @if (participants.loading() && !participants.data()) {
            <app-loading-spinner />
          } @else if (participants.error()) {
            <div class="p-5"><app-error-state [message]="participants.error()" (retry)="participants.load()" /></div>
          } @else if (participants.data()?.length) {
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th scope="col">Volunteer</th><th scope="col" class="hidden md:table-cell">Contact</th><th scope="col" class="hidden sm:table-cell">Registered</th><th scope="col" class="text-right">Attendance</th></tr></thead>
                <tbody class="divide-y divide-gray-100">
                  @for (p of participants.data(); track p.id) {
                    <tr>
                      <td><div class="flex items-center gap-3"><app-user-avatar [name]="p.name" [size]="32" /><span class="font-medium">{{ p.name }}</span></div></td>
                      <td class="hidden md:table-cell"><p class="text-xs">{{ p.email }}</p><p class="text-xs text-gray-400">{{ p.phone }}</p></td>
                      <td class="hidden text-xs text-gray-500 sm:table-cell">{{ p.registrationDate | date: 'mediumDate' }}</td>
                      <td class="text-right">
                        @if (attendanceOpen(event)) {
                          <label class="inline-flex cursor-pointer items-center gap-2 text-sm">
                            <span [class]="p.attendance ? 'font-semibold text-brand-700' : 'text-gray-500'">{{ p.attendance ? 'Present' : 'Absent' }}</span>
                            <input type="checkbox" class="peer sr-only" [checked]="p.attendance" (change)="toggle(event, p)"
                                   [disabled]="busy() || (event.status === 'COMPLETED' && p.attendance)"
                                   [attr.aria-label]="'Mark ' + p.name + ' as ' + (p.attendance ? 'absent' : 'present')" />
                            <span class="relative h-6 w-11 rounded-full bg-gray-200 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-brand-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-disabled:opacity-60"></span>
                          </label>
                        } @else {
                          <span class="text-xs text-gray-400">Not started</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="p-5"><app-empty-state icon="users" title="No volunteers registered yet" message="Share the public event page to invite volunteers." /></div>
          }
        </section>

        <section class="card card-body space-y-4" aria-labelledby="photos-heading">
          <h2 id="photos-heading" class="text-lg font-semibold">Before / after photos</h2>
          @if (event.status !== 'CANCELLED') {
            <div class="flex gap-2" role="radiogroup" aria-label="Photo type">
              @for (type of photoTypes; track type) {
                <button type="button" role="radio" [attr.aria-checked]="photoType() === type" (click)="photoType.set(type)"
                        [class]="photoType() === type ? 'btn btn-sm bg-brand-600 text-white' : 'btn btn-sm btn-secondary'">{{ type === 'BEFORE' ? 'Before' : 'After' }}</button>
              }
            </div>
            <app-image-uploader #uploader [(files)]="photos" [max]="6" inputId="event-photos" />
            <button type="button" class="btn btn-primary w-full" [disabled]="!photos().length || busy()" (click)="upload(event)">
              <lucide-icon name="upload" [size]="16" aria-hidden="true" /> Upload {{ photos().length || '' }} {{ photoType() === 'BEFORE' ? 'before' : 'after' }} photo{{ photos().length === 1 ? '' : 's' }}
            </button>
          }
          @if (event.photos.length) {
            <ul class="grid grid-cols-3 gap-2">
              @for (photo of event.photos; track photo.id) {
                <li class="group relative overflow-hidden rounded-lg">
                  <img [src]="photo.url | thumb: 240 : 240" [alt]="photo.type + ' photo'" class="aspect-square w-full object-cover" loading="lazy" />
                  <span class="absolute left-1 top-1 rounded bg-gray-900/70 px-1 text-[10px] font-bold uppercase text-white">{{ photo.type }}</span>
                  <button type="button" class="absolute right-1 top-1 rounded-full bg-white/95 p-1 text-red-600 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
                          (click)="deletePhoto(photo.id)" aria-label="Delete photo"><lucide-icon name="trash-2" [size]="12" aria-hidden="true" /></button>
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm text-gray-500">No photos yet. Upload "before" photos at the start and "after" photos once the area is clean.</p>
          }
        </section>
      </div>
    }
  `,
})
export class EventManagePage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly participantService = inject(ParticipantService);
  private readonly galleryService = inject(GalleryService);
  private readonly reportService = inject(ReportService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly state = createLoader(() => this.eventService.get(+this.id()), 'Unable to load this event.');
  protected readonly participants = createLoader(() => this.participantService.participants(+this.id()), 'Unable to load participants.');
  protected readonly busy = signal(false);
  protected readonly photos = signal<File[]>([]);
  protected readonly photoType = signal<PhotoType>('BEFORE');
  protected readonly photoTypes: PhotoType[] = ['BEFORE', 'AFTER'];
  private readonly uploader = viewChild<ImageUploaderComponent>('uploader');

  protected readonly actions = computed(() =>
    (this.state.data()?.allowedTransitions ?? []).map((s) => ACTIONS[s]).filter(Boolean),
  );

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    this.state.load();
    this.participants.load();
  }

  protected backLink(): string {
    return this.auth.hasRole('ADMIN') ? '/admin/events' : '/ngo/dashboard';
  }

  protected editable(event: CleanupEvent): boolean {
    return ['UPCOMING', 'OPEN', 'FULL'].includes(event.status);
  }

  protected canDelete(event: CleanupEvent): boolean {
    return event.status !== 'COMPLETED' && (this.auth.hasRole('ADMIN') || event.registeredCount === 0);
  }

  protected attendanceOpen(event: CleanupEvent): boolean {
    return event.status === 'IN_PROGRESS' || event.status === 'COMPLETED';
  }

  protected async changeStatus(event: CleanupEvent, action: StatusAction): Promise<void> {
    const result = await this.confirm.ask({
      title: action.confirm.title,
      message: action.confirm.message,
      confirmText: action.label,
      tone: action.confirm.tone,
      inputLabel: action.confirm.input ? (action.status === 'CANCELLED' ? 'Reason (shared with volunteers)' : 'Completion note (optional)') : undefined,
      inputRequired: action.status === 'CANCELLED',
    });
    if (!result.confirmed) return;
    this.busy.set(true);
    this.eventService.changeStatus(event.id, action.status, result.value || undefined).subscribe({
      next: (updated) => {
        this.state.data.set(updated);
        this.participants.load();
        this.busy.set(false);
        this.notifications.success(
          action.status === 'COMPLETED'
            ? `Event completed. ${updated.attendedCount} volunteer(s) received points and certificates.`
            : 'Event status updated.',
        );
      },
      error: (err) => this.fail(err),
    });
  }

  protected toggle(event: CleanupEvent, participant: Participant): void {
    this.busy.set(true);
    this.participantService.markAttendance(event.id, participant.id, !participant.attendance).subscribe({
      next: (updated) => {
        this.participants.data.update((list) => list?.map((p) => (p.id === updated.id ? updated : p)) ?? null);
        this.state.data.update((e) => e && { ...e, attendedCount: e.attendedCount + (updated.attendance ? 1 : -1) });
        this.busy.set(false);
        if (event.status === 'COMPLETED' && updated.attendance) {
          this.notifications.success(`${updated.name} received attendance points and a certificate.`);
        }
      },
      error: (err) => {
        this.fail(err);
        this.participants.load();
      },
    });
  }

  protected markAll(event: CleanupEvent): void {
    const absent = (this.participants.data() ?? []).filter((p) => !p.attendance);
    absent.forEach((p) => this.toggle(event, p));
  }

  protected upload(event: CleanupEvent): void {
    this.busy.set(true);
    this.eventService.addPhotos(event.id, this.photoType(), this.photos()).subscribe({
      next: (updated) => {
        this.state.data.set(updated);
        this.uploader()?.reset();
        this.busy.set(false);
        this.notifications.success('Photos uploaded.');
      },
      error: (err) => this.fail(err),
    });
  }

  protected async deletePhoto(photoId: number): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Delete photo?', message: 'This photo will be permanently removed.', confirmText: 'Delete', tone: 'danger' });
    if (!ok) return;
    this.reportService.deletePhoto(photoId).subscribe({
      next: () => {
        this.notifications.success('Photo deleted.');
        this.state.load();
      },
      error: (err) => this.fail(err),
    });
  }

  protected publishToGallery(event: CleanupEvent): void {
    this.busy.set(true);
    this.galleryService.createFromEvent(event.id).subscribe({
      next: (item) => {
        this.busy.set(false);
        this.notifications.success(item.approved ? 'Added to the community gallery.' : 'Submitted to the gallery for admin approval.');
      },
      error: (err) => this.fail(err),
    });
  }

  protected async deleteEvent(event: CleanupEvent): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete this event?',
      message: `"${event.title}" and its photos will be permanently removed. Consider cancelling instead if volunteers registered.`,
      confirmText: 'Delete event',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(true);
    this.eventService.delete(event.id).subscribe({
      next: () => {
        this.notifications.success('Event deleted.');
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
