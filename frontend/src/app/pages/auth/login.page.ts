import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { errorMessage } from '../../core/utils/http';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthShellComponent],
  template: `
    <app-auth-shell title="Welcome back" subtitle="Log in to report issues, join events and track your impact.">
      @if (error()) {
        <div class="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          <lucide-icon name="circle-alert" [size]="18" class="shrink-0" aria-hidden="true" /> {{ error() }}
        </div>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <div>
          <label class="label" for="email">Email</label>
          <input id="email" type="email" class="input" formControlName="email" autocomplete="email"
                 [class.input-invalid]="invalid('email')" [attr.aria-invalid]="invalid('email')" aria-describedby="email-error" />
          @if (invalid('email')) { <p id="email-error" class="field-error">Enter a valid email address.</p> }
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="label" for="password">Password</label>
            <a routerLink="/forgot-password" class="mb-1.5 text-xs font-semibold text-brand-700 hover:underline">Forgot password?</a>
          </div>
          <div class="relative">
            <input id="password" [type]="showPassword() ? 'text' : 'password'" class="input pr-10" formControlName="password"
                   autocomplete="current-password" [class.input-invalid]="invalid('password')" [attr.aria-invalid]="invalid('password')" />
            <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"
                    (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              <lucide-icon name="eye" [size]="16" aria-hidden="true" />
            </button>
          </div>
          @if (invalid('password')) { <p class="field-error">Password is required.</p> }
        </div>
        <button type="submit" class="btn btn-primary w-full" [disabled]="submitting()">
          @if (submitting()) { <lucide-icon name="loader" [size]="16" class="animate-spin" aria-hidden="true" /> Logging in… }
          @else { <lucide-icon name="log-in" [size]="16" aria-hidden="true" /> Log in }
        </button>
      </form>
      <p class="mt-6 text-center text-sm text-gray-500">
        New here? <a routerLink="/register" class="font-semibold text-brand-700 hover:underline">Create an account</a>
      </p>
    </app-auth-shell>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly returnUrl = input<string>();

  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.notifications.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
        const target = this.returnUrl();
        void this.router.navigateByUrl(target && target.startsWith('/') && !target.startsWith('//') ? target : this.auth.homeRoute());
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(errorMessage(err, 'Unable to log in. Please try again.'));
      },
    });
  }
}
