import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, RegisterRequest, Role, User } from '../models/api.models';
import { homeRouteFor } from '../utils/labels';
import { ApiService } from './api.service';

const TOKEN_KEY = 'ccp.token';
const USER_KEY = 'ccp.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);

  constructor() {
    this.restore();
  }

  get token(): string | null {
    const token = this._token();
    if (token && isExpired(token)) {
      this.clear();
      return null;
    }
    return token;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(tap((r) => this.store(r)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', request).pipe(tap((r) => this.store(r)));
  }

  forgotPassword(email: string): Observable<void> {
    return this.api.post<void>('/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string, confirmPassword: string): Observable<void> {
    return this.api.post<void>('/auth/reset-password', { token, password, confirmPassword });
  }

  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Observable<void> {
    return this.api.put<void>('/auth/password', { currentPassword, newPassword, confirmPassword });
  }

  /** Re-reads the current user from the API (e.g. after points change). */
  refresh(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(tap((user) => this.setUser(user)));
  }

  setUser(user: User): void {
    this._user.set(user);
    safeStorage(() => localStorage.setItem(USER_KEY, JSON.stringify(user)));
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.role();
    return !!role && roles.includes(role);
  }

  homeRoute(): string {
    const role = this.role();
    return role ? homeRouteFor(role) : '/';
  }

  logout(redirect = true, returnUrl?: string): void {
    this.clear();
    if (redirect) {
      void this.router.navigate(['/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
    }
  }

  private store(response: AuthResponse): void {
    this._token.set(response.accessToken);
    safeStorage(() => localStorage.setItem(TOKEN_KEY, response.accessToken));
    this.setUser(response.user);
  }

  private restore(): void {
    const token = safeStorage(() => localStorage.getItem(TOKEN_KEY));
    const rawUser = safeStorage(() => localStorage.getItem(USER_KEY));
    if (!token || !rawUser || isExpired(token)) {
      this.clear();
      return;
    }
    try {
      this._user.set(JSON.parse(rawUser) as User);
      this._token.set(token);
    } catch {
      this.clear();
    }
  }

  private clear(): void {
    this._token.set(null);
    this._user.set(null);
    safeStorage(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    });
  }
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function safeStorage<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
