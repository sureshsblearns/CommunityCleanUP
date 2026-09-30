import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api.models';

/** Extracts a user-friendly message from an API error, never exposing raw HTTP details. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the server. Please check your connection and try again.';
    }
    const body = error.error as Partial<ApiResponse<unknown>> | null;
    if (body && typeof body === 'object' && typeof body.message === 'string' && body.message) {
      return body.message;
    }
    if (error.status >= 500) {
      return 'The server ran into a problem. Please try again shortly.';
    }
  }
  return fallback;
}

/** Field-level validation errors returned by the API, if any. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return (error.error as ApiResponse<unknown>).errors ?? {};
  }
  return {};
}

/** Builds HttpParams skipping null/undefined/empty values. */
export function toParams(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
