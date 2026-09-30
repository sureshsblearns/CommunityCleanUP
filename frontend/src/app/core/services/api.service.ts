import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { ApiResponse } from '../models/api.models';

/** Thin wrapper around HttpClient that prefixes the API base URL and unwraps the `{ success, data }` envelope. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiBaseUrl;

  url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<ApiResponse<T>>(this.url(path), { params }).pipe(map((r) => r.data));
  }

  post<T>(path: string, body: unknown = {}, params?: HttpParams): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.url(path), body, { params }).pipe(map((r) => r.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  patch<T>(path: string, body: unknown = {}, params?: HttpParams): Observable<T> {
    return this.http.patch<ApiResponse<T>>(this.url(path), body, { params }).pipe(map((r) => r.data));
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(this.url(path)).pipe(map((r) => r.data));
  }

  blob(path: string): Observable<Blob> {
    return this.http.get(this.url(path), { responseType: 'blob' });
  }

  /** Multipart body with a JSON `data` part plus file parts. */
  static multipart(data: unknown, files: Record<string, File | File[]>): FormData {
    const form = new FormData();
    if (data !== undefined) {
      form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    }
    for (const [name, value] of Object.entries(files)) {
      for (const file of Array.isArray(value) ? value : [value]) {
        form.append(name, file, file.name);
      }
    }
    return form;
  }
}
