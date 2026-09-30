import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { errorMessage } from '../../core/utils/http';
import { matchFields, PASSWORD_HINT, PASSWORD_PATTERN } from '../../core/utils/validators';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthShellComponent],
  template: `
    <app-auth-shell title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      @if (sent()) {
        <div class="rounded-lg bg-brand-50 p-4 text-sm text-brand-800" role="status">
          <p class="font-semibold">Check your inbox</p>
          <p class="mt-1">If an account exists for that email, a reset link valid for 30 minutes is on its way.</p>
        </div>
      } @else {
        @if (error()) { <p class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error() }}</p> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" type="email" class="input" formControlName="email" autocomplete="email"
                   [class.input-invalid]="form.controls.email.invalid && form.controls.email.touched" />
            @if (form.controls.email.invalid && form.controls.email.touched) { <p class="field-error">Enter a valid email address.</p> }
          </div>
          <button type="submit" class="btn btn-primary w-full" [disabled]="submitting()">
            <lucide-icon name="mail" [size]="16" aria-hidden="true" /> Send reset link
          </button>
        </form>
      }
      <p class="mt-6 text-center text-sm"><a routerLink="/login" class="font-semibold text-brand-700 hover:underline">Back to log in</a></p>
    </app-auth-shell>
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  protected readonly form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => this.sent.set(true),
      error: (err) => {
        this.submitting.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthShellComponent],
  template: `
    <app-auth-shell title="Choose a new password">
      @if (!token()) {
        <p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          This reset link is incomplete. Please use the link from your email or <a routerLink="/forgot-password" class="font-semibold underline">request a new one</a>.
        </p>
      } @else {
        @if (error()) { <p class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error() }}</p> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          <div>
            <label class="label" for="password">New password</label>
            <input id="password" type="password" class="input" formControlName="password" autocomplete="new-password" />
            <p [class]="form.controls.password.invalid && form.controls.password.touched ? 'field-error' : 'field-hint'">{{ hint }}</p>
          </div>
          <div>
            <label class="label" for="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" type="password" class="input" formControlName="confirmPassword" autocomplete="new-password" />
            @if (form.hasError('mismatch') && form.controls.confirmPassword.touched) { <p class="field-error">Passwords do not match.</p> }
          </div>
          <button type="submit" class="btn btn-primary w-full" [disabled]="submitting()">
            <lucide-icon name="key-round" [size]="16" aria-hidden="true" /> Reset password
          </button>
        </form>
      }
    </app-auth-shell>
  `,
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly token = input<string>();
  protected readonly hint = PASSWORD_HINT;
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFields('password', 'confirmPassword') },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { password, confirmPassword } = this.form.getRawValue();
    this.auth.resetPassword(this.token()!, password, confirmPassword).subscribe({
      next: () => {
        this.notifications.success('Your password has been reset. You can now log in.');
        void this.router.navigate(['/login']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
