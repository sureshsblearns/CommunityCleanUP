import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CleanupEvent } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { CertificateService } from '../../core/services/certificate.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EventService } from '../../core/services/event.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { NotificationService } from '../../core/services/notification.service';
import { ParticipantService } from '../../core/services/participant.service';
import { errorMessage } from '../../core/utils/http';
import { createLoader } from '../../core/utils/loader';
import { UserAvatarComponent } from '../../shared/components/cards.component';
import { ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { MapViewComponent } from '../../shared/components/map-view.component';
import { StarRatingComponent } from '../../shared/components/star-rating.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ThumbPipe, Time12Pipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-event-detail-page',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, LucideAngularModule, StatusBadgeComponent, MapViewComponent,
    StarRatingComponent, UserAvatarComponent, LoadingSpinnerComponent, ErrorStateComponent, ThumbPipe, Time12Pipe],
  template: `
    <div class="container-page py-8">
      <a routerLink="/events" class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900">
        <lucide-icon name="arrow-left" [size]="15" aria-hidden="true" /> All events
      </a>

      @if (state.loading() && !state.data()) {
        <app-loading-spinner label="Loading event…" />
      } @else if (state.error()) {
        <app-error-state [message]="state.error()" (retry)="state.load()" />
      } @else if (state.data(); as event) {
        <div class="grid gap-8 lg:grid-cols-3">
          <div class="space-y-6 lg:col-span-2">
            <div class="card overflow-hidden">
              @if (event.coverImageUrl) {
                <img [src]="event.coverImageUrl | thumb: 1100 : 480" [alt]="event.title" class="aspect-[21/9] w-full object-cover" />
              }
              <div class="card-body">
                <div class="flex flex-wrap items-center gap-2">
                  <app-status-badge [value]="event.status" />
                  @if (event.averageRating) {
                    <span class="chip bg-amber-50 text-amber-800 ring-amber-200">
                      <lucide-icon name="star" [size]="13" class="fill-amber-400 text-amber-400" aria-hidden="true" />
                      {{ event.averageRating | number: '1.1-1' }} ({{ event.feedbackCount }})
                    </span>
                  }
                </div>
                <h1 class="mt-3 text-3xl font-bold">{{ event.title }}</h1>
                <p class="mt-1 text-sm text-gray-500">Organised by <span class="font-semibold text-brand-700">{{ event.organizer.organizationName || event.organizer.name }}</span></p>
                <p class="mt-5 whitespace-pre-line text-gray-700">{{ event.description }}</p>
                @if (event.relatedReport) {
                  <div class="mt-6 flex items-start gap-3 rounded-xl bg-brand-50 p-4">
                    <lucide-icon name="clipboard-list" [size]="20" class="mt-0.5 text-brand-700" aria-hidden="true" />
                    <div class="text-sm">
                      <p class="font-semibold text-brand-900">Cleaning up a verified community report</p>
                      @if (auth.isAuthenticated()) {
                        <a [routerLink]="['/reports', event.relatedReport.id]" class="text-brand-700 hover:underline">{{ event.relatedReport.title }}</a>
                      } @else {
                        <p class="text-brand-800">{{ event.relatedReport.title }}</p>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <section class="card card-body" aria-labelledby="where-heading">
              <h2 id="where-heading" class="mb-3 text-lg font-semibold">Meeting point</h2>
              <p class="mb-3 flex items-start gap-2 text-sm text-gray-600"><lucide-icon name="map-pin" [size]="16" class="mt-0.5 text-brand-600" aria-hidden="true" />{{ event.location }}</p>
              <app-map-view [markers]="markers()" />
            </section>

            @if (event.photos.length) {
              <section class="card card-body" aria-labelledby="photos-heading">
                <h2 id="photos-heading" class="mb-3 text-lg font-semibold">Cleanup photos</h2>
                <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  @for (photo of event.photos; track photo.id) {
                    <li class="relative overflow-hidden rounded-lg">
                      <a [href]="photo.url" target="_blank" rel="noopener"><img [src]="photo.url | thumb: 400 : 300" [alt]="photo.type + ' photo'" class="aspect-[4/3] w-full object-cover" loading="lazy" /></a>
                      <span class="absolute left-2 top-2 rounded bg-gray-900/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{{ photo.type }}</span>
                    </li>
                  }
                </ul>
              </section>
            }

            <section class="card card-body" aria-labelledby="feedback-heading">
              <h2 id="feedback-heading" class="mb-4 text-lg font-semibold">Volunteer feedback</h2>
              @if (event.viewer?.canSubmitFeedback) {
                <form class="mb-6 rounded-xl border border-brand-100 bg-brand-50/50 p-4" (submit)="$event.preventDefault(); submitFeedback(event)">
                  <p class="text-sm font-semibold">How was this cleanup?</p>
                  <div class="mt-2"><app-star-rating [(value)]="rating" /></div>
                  <label for="feedback-comments" class="label mt-3">Comments (optional)</label>
                  <textarea id="feedback-comments" class="input" rows="3" maxlength="1000" [(ngModel)]="comments" name="comments"
                            placeholder="What went well? What could be better?"></textarea>
                  <p class="field-hint">{{ comments.length }}/1000</p>
                  @if (feedbackError()) { <p class="field-error">{{ feedbackError() }}</p> }
                  <button type="submit" class="btn btn-primary mt-3" [disabled]="busy()">Submit feedback</button>
                </form>
              }
              @if (feedback.data(); as fb) {
                @if (fb.items.length) {
                  <ul class="divide-y divide-gray-100">
                    @for (item of fb.items; track item.id) {
                      <li class="flex gap-3 py-4">
                        <app-user-avatar [name]="item.userName" [size]="36" />
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="text-sm font-semibold">{{ item.userName }}</span>
                            <app-star-rating [value]="item.rating" [readonly]="true" [size]="14" />
                            <span class="text-xs text-gray-400">{{ item.submittedDate | date: 'mediumDate' }}</span>
                          </div>
                          @if (item.comments) { <p class="mt-1 text-sm text-gray-600">{{ item.comments }}</p> }
                        </div>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="text-sm text-gray-500">No feedback yet. Volunteers who attend can rate the event after it is completed.</p>
                }
              } @else if (feedback.error()) {
                <p class="text-sm text-red-600">{{ feedback.error() }}</p>
              }
            </section>
          </div>

          <aside class="space-y-6">
            <div class="card card-body lg:sticky lg:top-24">
              <dl class="space-y-4 text-sm">
                <div class="flex gap-3">
                  <lucide-icon name="calendar" [size]="18" class="mt-0.5 text-brand-600" aria-hidden="true" />
                  <div><dt class="text-gray-500">Date</dt><dd class="font-semibold">{{ event.eventDate | date: 'fullDate' }}</dd></div>
                </div>
                <div class="flex gap-3">
                  <lucide-icon name="clock" [size]="18" class="mt-0.5 text-brand-600" aria-hidden="true" />
                  <div><dt class="text-gray-500">Time</dt><dd class="font-semibold">{{ event.startTime | time12 }}@if (event.endTime) { – {{ event.endTime | time12 }} }</dd></div>
                </div>
                <div class="flex gap-3">
                  <lucide-icon name="users" [size]="18" class="mt-0.5 text-brand-600" aria-hidden="true" />
                  <div class="flex-1">
                    <dt class="text-gray-500">Volunteers</dt>
                    <dd class="font-semibold">{{ event.registeredCount }} registered · {{ event.remainingSlots }} slots left</dd>
                    <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" [attr.aria-valuenow]="event.registeredCount"
                         [attr.aria-valuemax]="event.volunteersRequired" aria-label="Capacity">
                      <div class="h-full rounded-full bg-brand-500" [style.width.%]="(event.registeredCount / event.volunteersRequired) * 100"></div>
                    </div>
                    <p class="mt-1 text-xs text-gray-400">Capacity {{ event.volunteersRequired }}</p>
                  </div>
                </div>
              </dl>

              <div class="mt-6 space-y-2 border-t border-gray-100 pt-5">
                @if (!auth.isAuthenticated()) {
                  <a routerLink="/login" [queryParams]="{ returnUrl: '/events/' + event.id }" class="btn btn-primary w-full">Log in to register</a>
                  <p class="text-center text-xs text-gray-500">New? <a routerLink="/register" class="font-semibold text-brand-700">Create a free account</a></p>
                } @else if (event.viewer; as viewer) {
                  @if (viewer.registered) {
                    <div class="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-800" role="status">
                      <lucide-icon [name]="viewer.attended ? 'badge-check' : 'circle-check'" [size]="18" aria-hidden="true" />
                      {{ viewer.attended ? 'Your attendance is confirmed' : "You're registered for this event" }}
                    </div>
                    @if (viewer.certificateId) {
                      <button type="button" class="btn btn-secondary w-full" (click)="downloadCertificate(viewer.certificateId)" [disabled]="busy()">
                        <lucide-icon name="download" [size]="16" aria-hidden="true" /> Download certificate
                      </button>
                    }
                    @if (canCancel(event)) {
                      <button type="button" class="btn btn-ghost w-full text-red-600 hover:bg-red-50" (click)="unregister(event)" [disabled]="busy()">
                        Cancel my registration
                      </button>
                    }
                  } @else if (viewer.canRegister) {
                    <button type="button" class="btn btn-primary btn-lg w-full" (click)="register(event)" [disabled]="busy()">
                      @if (busy()) { <lucide-icon name="loader" [size]="16" class="animate-spin" aria-hidden="true" /> }
                      @else { <lucide-icon name="hand-heart" [size]="18" aria-hidden="true" /> }
                      Register for this event
                    </button>
                    @if (event.remainingSlots <= 3) {
                      <p class="text-center text-xs font-medium text-amber-700">Only {{ event.remainingSlots }} slot{{ event.remainingSlots === 1 ? '' : 's' }} left!</p>
                    }
                  } @else {
                    <p class="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600" role="status">
                      <lucide-icon name="info" [size]="16" class="mt-0.5 shrink-0" aria-hidden="true" /> {{ viewer.registrationBlockedReason }}
                    </p>
                  }
                  @if (viewer.canManage) {
                    <a [routerLink]="auth.hasRole('ADMIN') ? ['/admin/events', event.id] : ['/ngo/events', event.id, 'manage']" class="btn btn-dark w-full">
                      <lucide-icon name="settings" [size]="16" aria-hidden="true" /> Manage event
                    </a>
                  }
                }
              </div>
            </div>
          </aside>
        </div>
      }
    </div>
  `,
})
export class EventDetailPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly participantService = inject(ParticipantService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly certificateService = inject(CertificateService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly state = createLoader(() => this.eventService.get(+this.id()), 'Unable to load this event.');
  protected readonly feedback = createLoader(() => this.feedbackService.forEvent(+this.id()), 'Unable to load feedback.');
  protected readonly busy = signal(false);
  protected readonly feedbackError = signal('');
  protected rating = 5;
  protected comments = '';

  protected readonly markers = computed(() => {
    const e = this.state.data();
    return e?.latitude != null && e.longitude != null ? [{ lat: +e.latitude, lng: +e.longitude, title: e.title }] : [];
  });

  ngOnInit(): void {
    if (isNaN(+this.id())) {
      void this.router.navigate(['/events']);
      return;
    }
    this.state.load();
    this.feedback.load();
  }

  protected canCancel(event: CleanupEvent): boolean {
    return ['UPCOMING', 'OPEN', 'FULL'].includes(event.status);
  }

  protected register(event: CleanupEvent): void {
    this.busy.set(true);
    this.participantService.register(event.id).subscribe({
      next: (updated) => {
        this.state.data.set(updated);
        this.busy.set(false);
        this.notifications.success('Your event registration is confirmed.');
        if (updated.remainingSlots > 0 && updated.remainingSlots <= 2) {
          this.notifications.warning('This event is almost full.');
        }
      },
      error: (err) => {
        this.busy.set(false);
        this.notifications.error(errorMessage(err, 'Unable to register for this event.'));
        this.state.load();
      },
    });
  }

  protected async unregister(event: CleanupEvent): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Cancel registration?',
      message: `You will lose your spot at "${event.title}". You can register again while slots remain.`,
      confirmText: 'Cancel registration',
      cancelText: 'Keep my spot',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(true);
    this.participantService.unregister(event.id).subscribe({
      next: (updated) => {
        this.state.data.set(updated);
        this.busy.set(false);
        this.notifications.info('Your registration has been cancelled.');
      },
      error: (err) => {
        this.busy.set(false);
        this.notifications.error(errorMessage(err));
      },
    });
  }

  protected submitFeedback(event: CleanupEvent): void {
    if (this.rating < 1 || this.rating > 5) {
      this.feedbackError.set('Please choose a rating between 1 and 5 stars.');
      return;
    }
    this.busy.set(true);
    this.feedbackError.set('');
    this.feedbackService.submit(event.id, this.rating, this.comments.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.success('Thank you for your feedback!');
        this.state.load();
        this.feedback.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.feedbackError.set(errorMessage(err, 'Unable to submit feedback.'));
      },
    });
  }

  protected downloadCertificate(id: number): void {
    this.busy.set(true);
    this.certificateService.get(id).subscribe({
      next: (certificate) =>
        this.certificateService.download(certificate).subscribe({
          next: () => this.busy.set(false),
          error: (err) => {
            this.busy.set(false);
            this.notifications.error(errorMessage(err, 'Unable to download the certificate.'));
          },
        }),
      error: (err) => {
        this.busy.set(false);
        this.notifications.error(errorMessage(err));
      },
    });
  }
}
