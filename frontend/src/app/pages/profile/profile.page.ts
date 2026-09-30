import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { errorMessage, fieldErrors } from '../../core/utils/http';
import { createLoader } from '../../core/utils/loader';
import { applyServerErrors, matchFields, PASSWORD_HINT, PASSWORD_PATTERN, PHONE_PATTERN } from '../../core/utils/validators';
import { UserAvatarComponent } from '../../shared/components/cards.component';
import { ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { LabelPipe } from '../../shared/pipes/pipes';

@Component({
  selector: 'app-profile-page',
  imports: [DatePipe, ReactiveFormsModule, LucideAngularModule, PageHeaderComponent, UserAvatarComponent, LoadingSpinnerComponent,
    ErrorStateComponent, LabelPipe],
  template: `
    <app-page-header title="My profile" subtitle="Manage your personal details and password." />

    @if (detail.loading() && !detail.data()) {
      <app-loading-spinner />
    } @else if (detail.error()) {
      <app-error-state [message]="detail.error()" (retry)="detail.load()" />
    } @else if (detail.data(); as d) {
      <div class="grid gap-6 lg:grid-cols-3">
        <aside class="card card-body h-fit text-center">
          <div class="flex justify-center"><app-user-avatar [name]="d.user.name" [size]="80" /></div>
          <h2 class="mt-4 text-lg font-semibold">{{ d.user.name }}</h2>
          <p class="text-sm text-gray-500">{{ d.user.role | label }}@if (d.user.organizationName) { · {{ d.user.organizationName }} }</p>
          <p class="mt-1 text-xs text-gray-400">Member since {{ d.user.createdAt | date: 'longDate' }}</p>
          <dl class="mt-6 grid grid-cols-2 gap-3 text-left">
            @for (stat of [
              { label: 'Points', value: d.user.points },
              { label: 'Reports', value: d.reportsSubmitted },
              { label: 'Events joined', value: d.eventsJoined },
              { label: 'Attended', value: d.eventsAttended },
              { label: 'Events created', value: d.eventsCreated },
              { label: 'Certificates', value: d.certificates }
            ]; track stat.label) {
              <div class="rounded-lg bg-gray-50 p-3"><dt class="text-xs text-gray-500">{{ stat.label }}</dt><dd class="font-display text-xl font-bold">{{ stat.value }}</dd></div>
            }
          </dl>
        </aside>

        <div class="space-y-6 lg:col-span-2">
          <form class="card card-body space-y-4" [formGroup]="profile" (ngSubmit)="saveProfile()" novalidate aria-labelledby="details-heading">
            <h2 id="details-heading" class="text-lg font-semibold">Personal details</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="name">Full name</label>
                <input id="name" class="input" formControlName="name" [class.input-invalid]="bad(profile.controls.name)" />
                @if (bad(profile.controls.name)) { <p class="field-error">Name must be 2–100 characters.</p> }
              </div>
              <div>
                <label class="label" for="phone">Phone</label>
                <input id="phone" type="tel" class="input" formControlName="phone" [class.input-invalid]="bad(profile.controls.phone)" />
                @if (bad(profile.controls.phone)) { <p class="field-error">Enter a valid phone number.</p> }
              </div>
            </div>
            <div>
              <label class="label" for="email">Email</label>
              <input id="email" class="input" [value]="d.user.email" disabled />
              <p class="field-hint">Email is used to sign in and cannot be changed.</p>
            </div>
            @if (d.user.role === 'NGO') {
              <div>
                <label class="label" for="organizationName">Organisation name</label>
                <input id="organizationName" class="input" formControlName="organizationName" [class.input-invalid]="bad(profile.controls.organizationName)" />
                @if (bad(profile.controls.organizationName)) { <p class="field-error">Organisation name is required.</p> }
              </div>
            }
            <div class="flex justify-end">
              <button type="submit" class="btn btn-primary" [disabled]="savingProfile() || profile.pristine">Save changes</button>
            </div>
          </form>

          <form class="card card-body space-y-4" [formGroup]="password" (ngSubmit)="changePassword()" novalidate aria-labelledby="password-heading">
            <h2 id="password-heading" class="text-lg font-semibold">Change password</h2>
            <div>
              <label class="label" for="currentPassword">Current password</label>
              <input id="currentPassword" type="password" class="input" formControlName="currentPassword" autocomplete="current-password" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="newPassword">New password</label>
                <input id="newPassword" type="password" class="input" formControlName="newPassword" autocomplete="new-password"
                       [class.input-invalid]="bad(password.controls.newPassword)" />
                <p [class]="bad(password.controls.newPassword) ? 'field-error' : 'field-hint'">{{ hint }}</p>
              </div>
              <div>
                <label class="label" for="confirmPassword">Confirm new password</label>
                <input id="confirmPassword" type="password" class="input" formControlName="confirmPassword" autocomplete="new-password" />
                @if (password.hasError('mismatch') && password.controls.confirmPassword.touched) { <p class="field-error">Passwords do not match.</p> }
              </div>
            </div>
            <div class="flex justify-end">
              <button type="submit" class="btn btn-dark" [disabled]="savingPassword()"><lucide-icon name="key-round" [size]="16" aria-hidden="true" /> Update password</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);

  protected readonly hint = PASSWORD_HINT;
  protected readonly detail = createLoader(() => this.userService.detail(this.auth.user()!.id), 'Unable to load your profile.');
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);

  protected readonly profile = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    organizationName: ['', Validators.maxLength(150)],
  });

  protected readonly password = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFields('newPassword', 'confirmPassword') },
  );

  ngOnInit(): void {
    const user = this.auth.user()!;
    this.profile.patchValue({ name: user.name, phone: user.phone ?? '', organizationName: user.organizationName ?? '' });
    if (user.role === 'NGO') this.profile.controls.organizationName.addValidators(Validators.required);
    this.detail.load();
  }

  protected bad(control: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected saveProfile(): void {
    if (this.profile.invalid) {
      this.profile.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    const v = this.profile.getRawValue();
    this.userService.update(this.auth.user()!.id, { ...v, organizationName: v.organizationName || null }).subscribe({
      next: (user) => {
        this.auth.setUser(user);
        this.profile.markAsPristine();
        this.savingProfile.set(false);
        this.notifications.success('Profile updated.');
        this.detail.load();
      },
      error: (err) => {
        this.savingProfile.set(false);
        applyServerErrors(this.profile, fieldErrors(err));
        this.notifications.error(errorMessage(err, 'Unable to update your profile.'));
      },
    });
  }

  protected changePassword(): void {
    if (this.password.invalid) {
      this.password.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    const v = this.password.getRawValue();
    this.auth.changePassword(v.currentPassword, v.newPassword, v.confirmPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.password.reset();
        this.notifications.success('Password updated.');
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.notifications.error(errorMessage(err, 'Unable to change your password.'));
      },
    });
  }
}
