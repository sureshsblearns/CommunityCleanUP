import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { CleanupEvent, EventRequest, ReportSummary } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { EventService } from '../../core/services/event.service';
import { NotificationService } from '../../core/services/notification.service';
import { ReportService } from '../../core/services/report.service';
import { errorMessage, fieldErrors } from '../../core/utils/http';
import { applyServerErrors } from '../../core/utils/validators';
import { LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { MapPickerComponent, PickedLocation } from '../../shared/components/map-picker.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-event-form-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, PageHeaderComponent, MapPickerComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header [title]="id() ? 'Edit cleanup event' : 'Create a cleanup event'" eyebrow="Organise"
                     subtitle="Link the event to a verified report so residents can follow the cleanup progress."
                     [backLink]="id() ? manageLink() : '/ngo/dashboard'" [backLabel]="id() ? 'Back to event' : 'Dashboard'" />

    @if (loading()) {
      <app-loading-spinner />
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <section class="card card-body space-y-4" aria-labelledby="details-heading">
            <h2 id="details-heading" class="text-lg font-semibold">Event details</h2>
            <div>
              <label class="label" for="title">Title</label>
              <input id="title" class="input" formControlName="title" maxlength="150" [class.input-invalid]="invalid('title')"
                     placeholder="e.g. Riverbank Restoration Morning" />
              @if (invalid('title')) { <p class="field-error">{{ serverError('title') ?? 'Title must be 5–150 characters.' }}</p> }
            </div>
            <div>
              <label class="label" for="description">Description</label>
              <textarea id="description" class="input" rows="5" formControlName="description" maxlength="2000"
                        [class.input-invalid]="invalid('description')"
                        placeholder="What will volunteers do? What should they bring? Any safety notes?"></textarea>
              @if (invalid('description')) { <p class="field-error">{{ serverError('description') ?? 'Description must be 10–2000 characters.' }}</p> }
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <label class="label" for="eventDate">Date</label>
                <input id="eventDate" type="date" class="input" formControlName="eventDate" [min]="today" [class.input-invalid]="invalid('eventDate')" />
                @if (invalid('eventDate')) { <p class="field-error">{{ serverError('eventDate') ?? 'Choose today or a future date.' }}</p> }
              </div>
              <div>
                <label class="label" for="startTime">Start time</label>
                <input id="startTime" type="time" class="input" formControlName="startTime" [class.input-invalid]="invalid('startTime')" />
                @if (invalid('startTime')) { <p class="field-error">Start time is required.</p> }
              </div>
              <div>
                <label class="label" for="endTime">End time <span class="font-normal text-gray-400">(optional)</span></label>
                <input id="endTime" type="time" class="input" formControlName="endTime" [class.input-invalid]="timeError()" />
                @if (timeError()) { <p class="field-error">End time must be after start time.</p> }
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="volunteersRequired">Volunteers required</label>
                <input id="volunteersRequired" type="number" min="1" max="1000" class="input" formControlName="volunteersRequired"
                       [class.input-invalid]="invalid('volunteersRequired')" />
                @if (invalid('volunteersRequired')) { <p class="field-error">{{ serverError('volunteersRequired') ?? 'Enter a number between 1 and 1000.' }}</p> }
              </div>
              <div>
                <label class="label" for="relatedReportId">Related report</label>
                <select id="relatedReportId" class="input" formControlName="relatedReportId">
                  <option [ngValue]="null">No linked report</option>
                  @for (report of reports(); track report.id) {
                    <option [ngValue]="report.id">#{{ report.id }} · {{ report.title }}</option>
                  }
                </select>
                <p class="field-hint">Only verified reports can be linked. Linking marks the report as "Cleaning scheduled".</p>
              </div>
            </div>
          </section>

          <section class="card card-body space-y-4" aria-labelledby="location-heading">
            <h2 id="location-heading" class="text-lg font-semibold">Meeting point</h2>
            <div>
              <label class="label" for="location">Meeting point / address</label>
              <input id="location" class="input" formControlName="location" maxlength="255" [class.input-invalid]="invalid('location')"
                     placeholder="e.g. Near the footbridge entrance, Kotturpuram" />
              @if (invalid('location')) { <p class="field-error">Meeting point is required.</p> }
            </div>
            <app-map-picker [latitude]="form.controls.latitude.value" [longitude]="form.controls.longitude.value"
                            (locationChange)="onLocation($event)" />
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="latitude">Latitude</label>
                <input id="latitude" type="number" step="any" class="input" formControlName="latitude" [class.input-invalid]="invalid('latitude')" />
                @if (invalid('latitude')) { <p class="field-error">Latitude must be between -90 and 90.</p> }
              </div>
              <div>
                <label class="label" for="longitude">Longitude</label>
                <input id="longitude" type="number" step="any" class="input" formControlName="longitude" [class.input-invalid]="invalid('longitude')" />
                @if (invalid('longitude')) { <p class="field-error">Longitude must be between -180 and 180.</p> }
              </div>
            </div>
          </section>
        </div>

        <aside class="space-y-4">
          <div class="card card-body lg:sticky lg:top-6">
            <h2 class="text-base font-semibold">Publishing</h2>
            @if (!id() || editingStatus() === 'UPCOMING') {
              <label class="mt-3 flex items-start gap-3 text-sm">
                <input type="checkbox" formControlName="publish" class="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <span><span class="font-medium">Open registrations now</span><br />
                  <span class="text-gray-500">Unchecked events are announced as "Upcoming" and you can open registrations later.</span></span>
              </label>
            } @else {
              <p class="mt-2 text-sm text-gray-500">Registration status is managed from the event management page.</p>
            }
            @if (error()) { <p class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error() }}</p> }
            <button type="submit" class="btn btn-primary mt-5 w-full" [disabled]="submitting()">
              @if (submitting()) { <lucide-icon name="loader" [size]="16" class="animate-spin" aria-hidden="true" /> Saving… }
              @else { <lucide-icon name="check" [size]="16" aria-hidden="true" /> {{ id() ? 'Save changes' : 'Create event' }} }
            </button>
            <a [routerLink]="id() ? manageLink() : '/ngo/dashboard'" class="btn btn-ghost mt-2 w-full">Cancel</a>
          </div>
        </aside>
      </form>
    }
  `,
})
export class EventFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly eventService = inject(EventService);
  private readonly reportService = inject(ReportService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly id = input<string>();
  /** Optional ?reportId= to pre-link a verified report. */
  readonly reportId = input<string>();

  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly reports = signal<ReportSummary[]>([]);
  protected readonly editingStatus = signal<string | null>(null);

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    eventDate: ['', Validators.required],
    startTime: ['09:00', Validators.required],
    endTime: [''],
    location: ['', [Validators.required, Validators.maxLength(255)]],
    latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
    volunteersRequired: [20 as number | null, [Validators.required, Validators.min(1), Validators.max(1000)]],
    relatedReportId: [null as number | null],
    publish: [true],
  });

  ngOnInit(): void {
    this.loadReports();
    const id = this.id();
    if (id) {
      this.loading.set(true);
      this.eventService.get(+id).subscribe({
        next: (event) => this.fill(event),
        error: (err) => {
          this.loading.set(false);
          this.notifications.error(errorMessage(err, 'Unable to load this event.'));
          void this.router.navigate(['/ngo/dashboard']);
        },
      });
    }
  }

  protected manageLink(): string {
    return this.auth.hasRole('ADMIN') ? `/admin/events/${this.id()}` : `/ngo/events/${this.id()}/manage`;
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name)!;
    return control.invalid && (control.touched || control.dirty);
  }

  protected serverError(name: string): string | null {
    return (this.form.get(name)?.errors?.['server'] as string | undefined) ?? null;
  }

  protected timeError(): boolean {
    const { startTime, endTime } = this.form.getRawValue();
    return !!endTime && !!startTime && endTime <= startTime;
  }

  protected onLocation(location: PickedLocation): void {
    this.form.patchValue({ latitude: location.latitude, longitude: location.longitude });
    if (location.address && !this.form.controls.location.value) {
      this.form.controls.location.setValue(location.address);
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.timeError()) {
      this.form.markAllAsTouched();
      this.notifications.warning('Please fix the highlighted fields.');
      return;
    }
    const v = this.form.getRawValue();
    const request: EventRequest = {
      title: v.title!.trim(),
      description: v.description!.trim(),
      eventDate: v.eventDate!,
      startTime: v.startTime!,
      endTime: v.endTime || null,
      location: v.location!.trim(),
      latitude: v.latitude,
      longitude: v.longitude,
      volunteersRequired: Number(v.volunteersRequired),
      relatedReportId: v.relatedReportId,
      publish: !!v.publish,
    };
    this.submitting.set(true);
    this.error.set('');
    const id = this.id();
    const call = id ? this.eventService.update(+id, request) : this.eventService.create(request);
    call.subscribe({
      next: (event) => {
        this.notifications.success(id ? 'Event updated.' : 'Event created successfully.');
        void this.router.navigateByUrl(
          this.auth.hasRole('ADMIN') ? `/admin/events/${event.id}` : `/ngo/events/${event.id}/manage`,
        );
      },
      error: (err) => {
        this.submitting.set(false);
        applyServerErrors(this.form, fieldErrors(err));
        this.error.set(errorMessage(err, 'Unable to save the event.'));
      },
    });
  }

  private loadReports(): void {
    forkJoin([
      this.reportService.list({ status: 'VERIFIED', size: 50 }),
      this.reportService.list({ status: 'CLEANING_SCHEDULED', size: 50 }),
    ]).subscribe({
      next: ([verified, scheduled]) => {
        this.reports.set([...verified.content, ...scheduled.content]);
        const preset = Number(this.reportId());
        const match = this.reports().find((r) => r.id === preset);
        if (match && !this.id()) {
          this.form.patchValue({
            relatedReportId: match.id,
            location: match.location,
            latitude: match.latitude ?? null,
            longitude: match.longitude ?? null,
            title: `Cleanup: ${match.title}`.slice(0, 150),
          });
        }
      },
      error: () => this.reports.set([]),
    });
  }

  private fill(event: CleanupEvent): void {
    this.editingStatus.set(event.status);
    if (event.relatedReport && !this.reports().some((r) => r.id === event.relatedReport!.id)) {
      this.reports.update((list) => [
        ...list,
        {
          id: event.relatedReport!.id,
          title: event.relatedReport!.title,
          status: event.relatedReport!.status,
          location: event.relatedReport!.location,
        } as ReportSummary,
      ]);
    }
    this.form.patchValue({
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime ?? '',
      location: event.location,
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      volunteersRequired: event.volunteersRequired,
      relatedReportId: event.relatedReport?.id ?? null,
      publish: event.status !== 'UPCOMING',
    });
    if (event.relatedReport) this.form.controls.relatedReportId.disable();
    this.loading.set(false);
  }
}
