import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Attaches the JWT to API requests and handles expired/invalid sessions globally:
 * a 401 on an authenticated request logs the user out and sends them to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  const apiBase = inject(APP_CONFIG).apiBaseUrl;

  const token = auth.token;
  const isApi = req.url.startsWith(apiBase);
  const request = token && isApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token && isApi) {
        notifications.warning('Your session has expired. Please log in again.');
        auth.logout(true, router.url);
      }
      return throwError(() => error);
    }),
  );
};
