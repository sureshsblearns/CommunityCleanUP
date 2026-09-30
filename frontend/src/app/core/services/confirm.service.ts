import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary' | 'warning';
  /** When set, the dialog shows a text area and resolves with its value. */
  inputLabel?: string;
  inputRequired?: boolean;
  inputPlaceholder?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
  value: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (result: ConfirmResult) => void;
}

/** Promise-based replacement for window.confirm rendered by ConfirmDialogComponent. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(options: ConfirmOptions): Promise<ConfirmResult> {
    return new Promise((resolve) => this.pending.set({ ...options, resolve }));
  }

  async confirm(options: ConfirmOptions): Promise<boolean> {
    return (await this.ask(options)).confirmed;
  }

  close(result: ConfirmResult): void {
    const pending = this.pending();
    this.pending.set(null);
    pending?.resolve(result);
  }
}
