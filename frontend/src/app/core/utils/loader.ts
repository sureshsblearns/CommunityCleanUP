import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { errorMessage } from './http';

/**
 * Tracks loading / error / data state for a request so every page can render consistent
 * loading, empty and error states. Must be created in an injection context (component field).
 */
export function createLoader<T>(request: () => Observable<T>, fallbackError = 'Unable to load data. Please try again.') {
  const destroyRef = inject(DestroyRef);
  const data = signal<T | null>(null);
  const loading = signal(false);
  const error = signal('');

  const load = () => {
    loading.set(true);
    error.set('');
    request()
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe({
        next: (value) => {
          data.set(value);
          loading.set(false);
        },
        error: (err: unknown) => {
          error.set(errorMessage(err, fallbackError));
          loading.set(false);
        },
      });
  };

  return { data, loading, error, load };
}
