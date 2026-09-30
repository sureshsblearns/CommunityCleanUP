import { Component, effect, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService, ToastType } from '../../core/services/notification.service';

const TOAST_STYLES: Record<ToastType, { classes: string; icon: string }> = {
  success: { classes: 'border-brand-200 bg-white text-brand-900', icon: 'circle-check' },
  error: { classes: 'border-red-200 bg-white text-red-800', icon: 'circle-alert' },
  info: { classes: 'border-sky-200 bg-white text-sky-900', icon: 'info' },
  warning: { classes: 'border-amber-200 bg-white text-amber-900', icon: 'triangle-alert' },
};

@Component({
  selector: 'app-toast-container',
  imports: [LucideAngularModule],
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
         aria-live="polite" aria-atomic="false">
      @for (toast of notifications.toasts(); track toast.id) {
        <div class="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3.5 shadow-lg"
             [class]="styles[toast.type].classes" [attr.role]="toast.type === 'error' ? 'alert' : 'status'">
          <lucide-icon [name]="styles[toast.type].icon" [size]="20" class="mt-0.5 shrink-0" aria-hidden="true" />
          <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
          <button type="button" class="rounded p-0.5 opacity-60 hover:opacity-100" (click)="notifications.dismiss(toast.id)"
                  aria-label="Dismiss notification">
            <lucide-icon name="x" [size]="16" aria-hidden="true" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly notifications = inject(NotificationService);
  protected readonly styles = TOAST_STYLES;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [LucideAngularModule, FormsModule],
  template: `
    @if (confirm.pending(); as dialog) {
      <div class="animate-fade-in fixed inset-0 z-[90] flex items-end justify-center bg-gray-900/50 p-4 sm:items-center"
           (click)="cancel()">
        <div #panel class="animate-toast-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog"
             aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" tabindex="-1"
             (click)="$event.stopPropagation()">
          <div class="flex items-start gap-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                 [class]="dialog.tone === 'danger' ? 'bg-red-100 text-red-600' : dialog.tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-700'">
              <lucide-icon [name]="dialog.tone === 'danger' ? 'triangle-alert' : 'circle-alert'" [size]="22" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 id="confirm-title" class="text-lg font-semibold">{{ dialog.title }}</h2>
              <p id="confirm-message" class="mt-1 text-sm text-gray-600">{{ dialog.message }}</p>
            </div>
          </div>
          @if (dialog.inputLabel) {
            <div class="mt-4">
              <label for="confirm-input" class="label">{{ dialog.inputLabel }}</label>
              <textarea id="confirm-input" class="input" rows="3" maxlength="500" [(ngModel)]="value"
                        [placeholder]="dialog.inputPlaceholder ?? ''"></textarea>
              @if (showError()) {
                <p class="field-error">This field is required.</p>
              }
            </div>
          }
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" class="btn btn-secondary" (click)="cancel()">{{ dialog.cancelText ?? 'Cancel' }}</button>
            <button type="button" [class]="dialog.tone === 'danger' ? 'btn btn-danger' : dialog.tone === 'warning' ? 'btn btn-warning' : 'btn btn-primary'"
                    (click)="accept()">
              {{ dialog.confirmText ?? 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  protected value = '';
  protected readonly showError = signal(false);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    effect(() => {
      if (this.confirm.pending()) {
        this.value = '';
        this.showError.set(false);
        queueMicrotask(() => this.panel()?.nativeElement.focus());
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected cancel(): void {
    if (this.confirm.pending()) this.confirm.close({ confirmed: false, value: '' });
  }

  protected accept(): void {
    const dialog = this.confirm.pending();
    if (dialog?.inputRequired && !this.value.trim()) {
      this.showError.set(true);
      return;
    }
    this.confirm.close({ confirmed: true, value: this.value.trim() });
  }
}
