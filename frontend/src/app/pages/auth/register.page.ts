import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { RegisterRequest } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { errorMessage, fieldErrors } from '../../core/utils/http';
import { applyServerErrors, matchFields, PASSWORD_HINT, PASSWORD_PATTERN, PHONE_PATTERN } from '../../core/utils/validators';
import { AuthShellComponent } from './auth-shell.component';

type RegistrableRole = RegisterRequest['role'];
type RegisterField = 'role' | 'name' | 'organizationName' | 'email' | 'phone' | 'password' | 'confirmPassword';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthShellComponent],
  template: `
    <app-auth-shell title="Create your account" subtitle="Join your community's cleanup network.">
      @if (error()) {
        <div class="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          <lucide-icon name="circle-alert" [size]="18" class="shrink-0" aria-hidden="true" /> {{ error() }}
        </div>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <fieldset>
          <legend class="label">I want to join as</legend>
          <div class="grid grid-cols-3 gap-2">
            @for (option of roles; track option.value) {
              <label class="flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-center text-xs font-semibold transition"
                     [class]="form.controls.role.value === option.value ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100' : 'border-gray-200 text-gray-600 hover:border-brand-300'">
                <input type="radio" class="sr-only" formControlName="role" [value]="option.value" />
                <lucide-icon [name]="option.icon" [size]="20" aria-hidden="true" />
                {{ option.label }}
              </label>
            }
          </div>
          <p class="field-hint">{{ roleHint() }}</p>
        </fieldset>

        <div>
          <label class="label" for="name">Full name</label>
          <input id="name" class="input" formControlName="name" autocomplete="name" [class.input-invalid]="invalid('name')" />
          @if (invalid('name')) { <p class="field-error">{{ serverError('name') ?? 'Enter your full name (2–100 characters).' }}</p> }
        </div>

        @if (form.controls.role.value === 'NGO') {
          <div>
            <label class="label" for="organizationName">Organisation name</label>
            <input id="organizationName" class="input" formControlName="organizationName" autocomplete="organization"
                   [class.input-invalid]="invalid('organizationName')" />
            @if (invalid('organizationName')) { <p class="field-error">Organisation name is required for NGO accounts.</p> }
          </div>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" type="email" class="input" formControlName="email" autocomplete="email" [class.input-invalid]="invalid('email')" />
            @if (invalid('email')) { <p class="field-error">{{ serverError('email') ?? 'Enter a valid email address.' }}</p> }
          </div>
          <div>
            <label class="label" for="phone">Phone</label>
            <input id="phone" type="tel" class="input" formControlName="phone" autocomplete="tel" placeholder="+91 98765 43210"
                   [class.input-invalid]="invalid('phone')" />
            @if (invalid('phone')) { <p class="field-error">{{ serverError('phone') ?? 'Enter a valid phone number.' }}</p> }
          </div>
        </div>

        <div>
          <label class="label" for="password">Password</label>
          <input id="password" type="password" class="input" formControlName="password" autocomplete="new-password"
                 [class.input-invalid]="invalid('password')" aria-describedby="password-hint" />
          <p id="password-hint" [class]="invalid('password') ? 'field-error' : 'field-hint'">{{ passwordHint }}</p>
        </div>
        <div>
          <label class="label" for="confirmPassword">Confirm password</label>
          <input id="confirmPassword" type="password" class="input" formControlName="confirmPassword" autocomplete="new-password"
                 [class.input-invalid]="mismatch()" />
          @if (mismatch()) { <p class="field-error">Passwords do not match.</p> }
        </div>

        <button type="submit" class="btn btn-primary w-full" [disabled]="submitting()">
          @if (submitting()) { <lucide-icon name="loader" [size]="16" class="animate-spin" aria-hidden="true" /> Creating account… }
          @else { <lucide-icon name="user-plus" [size]="16" aria-hidden="true" /> Create account }
        </button>
      </form>
      <p class="mt-6 text-center text-sm text-gray-500">
        Already have an account? <a routerLink="/login" class="font-semibold text-brand-700 hover:underline">Log in</a>
      </p>
    </app-auth-shell>
  `,
})
export class RegisterPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  /** Pre-selects a role from ?role=VOLUNTEER|NGO|RESIDENT. */
  readonly role = input<string>();

  protected readonly passwordHint = PASSWORD_HINT;
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly roles: { value: RegistrableRole; label: string; icon: string; hint: string }[] = [
    { value: 'RESIDENT', label: 'Resident', icon: 'user', hint: 'Report dirty areas and track their cleanup.' },
    { value: 'VOLUNTEER', label: 'Volunteer', icon: 'hand-heart', hint: 'Join cleanups and earn points, badges and certificates.' },
    { value: 'NGO', label: 'NGO', icon: 'building-2', hint: 'Organise cleanup events for verified reports.' },
  ];

  protected readonly form = this.fb.nonNullable.group(
    {
      role: ['RESIDENT' as RegistrableRole, Validators.required],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      organizationName: ['', Validators.maxLength(150)],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFields('password', 'confirmPassword') },
  );

  ngOnInit(): void {
    const preset = this.roles.find((r) => r.value === this.role()?.toUpperCase());
    if (preset) this.form.controls.role.setValue(preset.value);
    this.form.controls.role.valueChanges.subscribe((role) => {
      const org = this.form.controls.organizationName;
      org.setValidators(role === 'NGO' ? [Validators.required, Validators.maxLength(150)] : [Validators.maxLength(150)]);
      org.updateValueAndValidity();
    });
  }

  protected roleHint(): string {
    return this.roles.find((r) => r.value === this.form.controls.role.value)?.hint ?? '';
  }

  protected invalid(name: RegisterField): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected serverError(name: RegisterField): string | null {
    return (this.form.controls[name].errors?.['server'] as string | undefined) ?? null;
  }

  protected mismatch(): boolean {
    const confirm = this.form.controls.confirmPassword;
    return (confirm.touched || confirm.dirty) && (confirm.invalid || this.form.hasError('mismatch'));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    this.auth
      .register({ ...value, organizationName: value.role === 'NGO' ? value.organizationName : undefined })
      .subscribe({
        next: (res) => {
          this.notifications.success(`Welcome to the community, ${res.user.name.split(' ')[0]}!`);
          void this.router.navigateByUrl(this.auth.homeRoute());
        },
        error: (err) => {
          this.submitting.set(false);
          applyServerErrors(this.form, fieldErrors(err));
          this.error.set(errorMessage(err, 'Unable to create your account. Please try again.'));
        },
      });
  }
}
