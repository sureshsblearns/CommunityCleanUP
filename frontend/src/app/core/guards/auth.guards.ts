import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/api.models';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/** Requires a signed-in user; otherwise redirects to /login with a return URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated() && auth.token) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Requires one of the roles listed in route data `roles`. The backend enforces the same rules independently. */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated() || !auth.token) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const roles = (route.data['roles'] as Role[] | undefined) ?? [];
  if (roles.length === 0 || auth.hasRole(...roles)) return true;
  inject(NotificationService).warning('You do not have access to that page.');
  return router.createUrlTree([auth.homeRoute()]);
};

/** Keeps signed-in users away from login/register pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated() && auth.token) {
    return inject(Router).createUrlTree([auth.homeRoute()]);
  }
  return true;
};
