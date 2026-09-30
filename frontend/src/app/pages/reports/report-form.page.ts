import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Report, ReportRequest, Urgency, WasteType } from '../../core/models/api.models';
import { NotificationService } from '../../core/services/notification.service';
import { ReportService } from '../../core/services/report.service';
import { errorMessage, fieldErrors } from '../../core/utils/http';
import { URGENCIES, WASTE_TYPES } from '../../core/utils/labels';
import { applyServerErrors } from '../../core/utils/validators';
import { LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { ImageUploaderComponent } from '../../shared/components/image-uploader.component';
import { MapPickerComponent, PickedLocation } from '../../shared/components/map-picker.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { ThumbPipe } from '../../shared/pipes/pipes';

const URGENCY_HINTS: Record<Urgency, string> = {
  LOW: 'Unsightly but not harmful',
  MEDIUM: 'Growing problem, attracts pests',
  HIGH: 'Health or safety risk',
  CRITICAL: 'Blocking water/roads or hazardous',
};

@Component({
  selector: 'app-report-form-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, PageHeaderComponent, MapPickerComponent, ImageUploaderComponent,
    LoadingSpinnerComponent, ThumbPipe],
  template: `
    <app-page-header [title]="id() ? 'Edit report' : 'Report a dirty area'" eyebrow="Dirty area reporting"
                     [subtitle]="id() ? 'Update the details of your report.' : 'Share what you saw. Clear photos and an accurate location help organisers act quickly.'"
                     [backLink]="id() ? ['/reports', id()] : '/reports'" [backLabel]="id() ? 'Back to report' : 'My reports'" />

    @if (loading()) {
      <app-loading-spinner />
    } @else {
      @if (rejectionNote()) {
        <div class="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          <lucide-icon name="info" [size]="18" class="mt-0.5 shrink-0" aria-hidden="true" />
          <p>This report was rejected: <em>{{ rejectionNote() }}</em>. Saving your changes will resubmit it for review.</p>
        </div>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <section class="card card-body space-y-4" aria-labelledby="what-heading">
            <h2 id="what-heading" class="text-lg font-semibold">What did you see?</h2>
            <div>
              <label class="label" for="title">Title</label>
              <input id="title" class="input" formControlName="title" maxlength="150" placeholder="e.g. Plastic waste dumped near the lake"
                     [class.input-invalid]="invalid('title')" />
              @if (invalid('title')) { <p class="field-error">{{ serverError('title') ?? 'Title must be 5–150 characters.' }}</p> }
            </div>
            <div>
              <label class="label" for="description">Description</label>
              <textarea id="description" class="input" rows="4" formControlName="description" maxlength="2000"
                        placeholder="Describe the waste, how long it has been there and anything organisers should know."
                        [class.input-invalid]="invalid('description')"></textarea>
              <div class="flex justify-between">
                @if (invalid('description')) { <p class="field-error">{{ serverError('description') ?? 'Description must be 10–2000 characters.' }}</p> } @else { <span></span> }
                <p class="field-hint">{{ form.controls.description.value.length }}/2000</p>
              </div>
            </div>
            <div>
              <label class="label" for="wasteType">Waste type</label>
              <select id="wasteType" class="input" formControlName="wasteType" [class.input-invalid]="invalid('wasteType')">
                <option value="" disabled>Select waste type</option>
                @for (w of wasteTypes; track w.value) { <option [value]="w.value">{{ w.label }}</option> }
              </select>
              @if (invalid('wasteType')) { <p class="field-error">Please choose a waste type.</p> }
            </div>
            <fieldset>
              <legend class="label">Urgency</legend>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                @for (u of urgencies; track u.value) {
                  <label class="cursor-pointer rounded-xl border p-3 text-sm transition"
                         [class]="form.controls.urgency.value === u.value ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-gray-200 hover:border-brand-300'">
                    <input type="radio" class="sr-only" formControlName="urgency" [value]="u.value" />
                    <span class="block font-semibold">{{ u.label }}</span>
                    <span class="block text-xs text-gray-500">{{ urgencyHints[u.value] }}</span>
                  </label>
                }
              </div>
              @if (invalid('urgency')) { <p class="field-error">Please choose an urgency level.</p> }
            </fieldset>
          </section>

          <section class="card card-body space-y-4" aria-labelledby="where-heading">
            <h2 id="where-heading" class="text-lg font-semibold">Where is it?</h2>
            <app-map-picker [latitude]="form.controls.latitude.value" [longitude]="form.controls.longitude.value"
                            (locationChange)="onLocation($event)" />
            <div>
              <label class="label" for="location">Address / location description</label>
              <input id="location" class="input" formControlName="location" maxlength="255" placeholder="Street, landmark or area"
                     [class.input-invalid]="invalid('location')" />
              @if (invalid('location')) { <p class="field-error">Please describe the location.</p> }
            </div>
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

          @if (!id()) {
            <section class="card card-body space-y-3" aria-labelledby="photos-heading">
              <h2 id="photos-heading" class="text-lg font-semibold">Photos</h2>
              <p class="text-sm text-gray-500">Attach at least one clear photo of the area.</p>
              <app-image-uploader [(files)]="photos" [max]="6" [invalid]="photoError()" />
              @if (photoError()) { <p class="field-error">Please attach at least one photo.</p> }
            </section>
          } @else if (existing(); as report) {
            <section class="card card-body" aria-labelledby="photos-heading">
              <h2 id="photos-heading" class="text-lg font-semibold">Photos</h2>
              <p class="mb-3 text-sm text-gray-500">Manage photos from the report page.</p>
              <div class="flex gap-2 overflow-x-auto">
                @for (photo of report.photos; track photo.id) {
                  <img [src]="photo.url | thumb: 160 : 120" alt="Report photo" class="h-24 w-32 shrink-0 rounded-lg object-cover" />
                }
              </div>
            </section>
          }
        </div>

        <aside>
          <div class="card card-body space-y-4 lg:sticky lg:top-6">
            <h2 class="text-base font-semibold">Before you submit</h2>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex gap-2"><lucide-icon name="check" [size]="16" class="mt-0.5 text-brand-600" aria-hidden="true" /> Stay safe — don't touch hazardous waste.</li>
              <li class="flex gap-2"><lucide-icon name="check" [size]="16" class="mt-0.5 text-brand-600" aria-hidden="true" /> Avoid photographing people's faces.</li>
              <li class="flex gap-2"><lucide-icon name="check" [size]="16" class="mt-0.5 text-brand-600" aria-hidden="true" /> An admin will verify the report before it is public.</li>
            </ul>
            @if (error()) { <p class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error() }}</p> }
            <button type="submit" class="btn btn-primary w-full" [disabled]="submitting()">
              @if (submitting()) { <lucide-icon name="loader" [size]="16" class="animate-spin" aria-hidden="true" /> {{ id() ? 'Saving…' : 'Uploading…' }} }
              @else { <lucide-icon name="megaphone" [size]="16" aria-hidden="true" /> {{ id() ? 'Save changes' : 'Submit report' }} }
            </button>
            <a [routerLink]="id() ? ['/reports', id()] : '/reports'" class="btn btn-ghost w-full">Cancel</a>
          </div>
        </aside>
      </form>
    }
  `,
})
export class ReportFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly reportService = inject(ReportService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly id = input<string>();

  protected readonly wasteTypes = WASTE_TYPES;
  protected readonly urgencies = URGENCIES;
  protected readonly urgencyHints = URGENCY_HINTS;
  protected readonly photos = signal<File[]>([]);
  protected readonly photoError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly existing = signal<Report | null>(null);
  protected readonly rejectionNote = signal('');

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    wasteType: ['' as WasteType | '', Validators.required],
    urgency: ['MEDIUM' as Urgency, Validators.required],
    location: ['', [Validators.required, Validators.maxLength(255)]],
    latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.loading.set(true);
    this.reportService.get(+id).subscribe({
      next: (report) => {
        if (!report.canEdit) {
          this.notifications.warning('This report can no longer be edited.');
          void this.router.navigate(['/reports', report.id]);
          return;
        }
        this.existing.set(report);
        if (report.status === 'REJECTED') this.rejectionNote.set(report.adminComment ?? 'no reason given');
        this.form.patchValue({
          title: report.title,
          description: report.description,
          wasteType: report.wasteType,
          urgency: report.urgency,
          location: report.location,
          latitude: report.latitude ?? null,
          longitude: report.longitude ?? null,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.notifications.error(errorMessage(err, 'Unable to load the report.'));
        void this.router.navigate(['/reports']);
      },
    });
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name)!;
    return control.invalid && (control.touched || control.dirty);
  }

  protected serverError(name: string): string | null {
    return (this.form.get(name)?.errors?.['server'] as string | undefined) ?? null;
  }

  protected onLocation(location: PickedLocation): void {
    this.form.patchValue({ latitude: location.latitude, longitude: location.longitude });
    if (location.address) this.form.controls.location.setValue(location.address);
  }

  protected submit(): void {
    const needsPhoto = !this.id() && this.photos().length === 0;
    this.photoError.set(needsPhoto);
    if (this.form.invalid || needsPhoto) {
      this.form.markAllAsTouched();
      this.notifications.warning('Please complete the highlighted fields.');
      return;
    }
    const v = this.form.getRawValue();
    const request: ReportRequest = {
      title: v.title.trim(),
      description: v.description.trim(),
      wasteType: v.wasteType as WasteType,
      urgency: v.urgency,
      location: v.location.trim(),
      latitude: v.latitude,
      longitude: v.longitude,
    };
    this.submitting.set(true);
    this.error.set('');
    const id = this.id();
    const call = id ? this.reportService.update(+id, request) : this.reportService.create(request, this.photos());
    call.subscribe({
      next: (report) => {
        this.notifications.success(id ? 'Report updated.' : 'Report submitted successfully.');
        void this.router.navigate(['/reports', report.id]);
      },
      error: (err) => {
        this.submitting.set(false);
        applyServerErrors(this.form, fieldErrors(err));
        this.error.set(errorMessage(err, 'Unable to submit report.'));
      },
    });
  }
}
