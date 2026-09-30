import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

/** Application-wide toast notifications. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message, 6000);
  }

  info(message: string): void {
    this.show('info', message);
  }

  warning(message: string): void {
    this.show('warning', message, 5000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(type: ToastType, message: string, duration = 4000): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list.slice(-3), { id, type, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
