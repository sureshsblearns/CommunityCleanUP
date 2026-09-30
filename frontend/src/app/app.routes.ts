import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guards';
import { AuthService } from './core/services/auth.service';
import { PublicLayoutComponent, ShellLayoutComponent } from './layouts/layouts.component';

/** /dashboard is the resident dashboard; other roles are sent to their own dashboards. */
const dashboardRedirect = () => {
  const auth = inject(AuthService);
  return auth.hasRole('RESIDENT') ? true : inject(Router).createUrlTree([auth.homeRoute()]);
};


export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', title: 'Community Clean-Up Portal', loadComponent: () => import('./pages/public/landing.page').then((m) => m.LandingPage) },
      { path: 'about', title: 'About · Community Clean-Up', loadComponent: () => import('./pages/public/about.page').then((m) => m.AboutPage) },
      { path: 'events', title: 'Cleanup events', loadComponent: () => import('./pages/events/events-list.page').then((m) => m.EventsListPage) },
      { path: 'events/:id', title: 'Cleanup event', loadComponent: () => import('./pages/events/event-detail.page').then((m) => m.EventDetailPage) },
      { path: 'gallery', title: 'Community gallery', loadComponent: () => import('./pages/public/gallery.page').then((m) => m.GalleryPage) },
      { path: 'login', title: 'Log in', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage) },
      { path: 'register', title: 'Create account', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage) },
      { path: 'forgot-password', title: 'Forgot password', loadComponent: () => import('./pages/auth/password.pages').then((m) => m.ForgotPasswordPage) },
      { path: 'reset-password', title: 'Reset password', loadComponent: () => import('./pages/auth/password.pages').then((m) => m.ResetPasswordPage) },
    ],
  },
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', title: 'Dashboard', canActivate: [dashboardRedirect], loadComponent: () => import('./pages/dashboard/resident-dashboard.page').then((m) => m.ResidentDashboardPage) },
      { path: 'reports', title: 'Reports', loadComponent: () => import('./pages/reports/reports-list.page').then((m) => m.ReportsListPage) },
      {
        path: 'reports/create',
        title: 'Report a dirty area',
        canActivate: [roleGuard],
        data: { roles: ['RESIDENT', 'VOLUNTEER', 'ADMIN'] },
        loadComponent: () => import('./pages/reports/report-form.page').then((m) => m.ReportFormPage),
      },
      { path: 'reports/:id/edit', title: 'Edit report', loadComponent: () => import('./pages/reports/report-form.page').then((m) => m.ReportFormPage) },
      { path: 'reports/:id', title: 'Report details', loadComponent: () => import('./pages/reports/report-detail.page').then((m) => m.ReportDetailPage) },
      { path: 'leaderboard', title: 'Leaderboard', loadComponent: () => import('./pages/rewards/leaderboard.page').then((m) => m.LeaderboardPage) },
      { path: 'rewards', title: 'My rewards', loadComponent: () => import('./pages/rewards/rewards.page').then((m) => m.RewardsPage) },
      { path: 'certificates', title: 'My certificates', loadComponent: () => import('./pages/rewards/certificates.page').then((m) => m.CertificatesPage) },
      { path: 'profile', title: 'My profile', loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage) },
      {
        path: 'volunteer/dashboard',
        title: 'Volunteer dashboard',
        canActivate: [roleGuard],
        data: { roles: ['VOLUNTEER'] },
        loadComponent: () => import('./pages/dashboard/volunteer-dashboard.page').then((m) => m.VolunteerDashboardPage),
      },
      {
        path: 'ngo',
        canActivate: [roleGuard],
        data: { roles: ['NGO', 'ADMIN'] },
        children: [
          { path: 'dashboard', title: 'Organiser dashboard', loadComponent: () => import('./pages/dashboard/ngo-dashboard.page').then((m) => m.NgoDashboardPage) },
          { path: 'events/create', title: 'Create event', loadComponent: () => import('./pages/events/event-form.page').then((m) => m.EventFormPage) },
          { path: 'events/:id/edit', title: 'Edit event', loadComponent: () => import('./pages/events/event-form.page').then((m) => m.EventFormPage) },
          { path: 'events/:id/manage', title: 'Manage event', loadComponent: () => import('./pages/events/event-manage.page').then((m) => m.EventManagePage) },
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
        ],
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        children: [
          { path: 'dashboard', title: 'Admin dashboard', loadComponent: () => import('./pages/admin/admin-dashboard.page').then((m) => m.AdminDashboardPage) },
          { path: 'users', title: 'Manage users', loadComponent: () => import('./pages/admin/admin-users.page').then((m) => m.AdminUsersPage) },
          { path: 'reports', title: 'Manage reports', loadComponent: () => import('./pages/admin/admin-reports.page').then((m) => m.AdminReportsPage) },
          { path: 'reports/:id', title: 'Review report', loadComponent: () => import('./pages/reports/report-detail.page').then((m) => m.ReportDetailPage) },
          { path: 'events', title: 'Manage events', loadComponent: () => import('./pages/admin/admin-events.page').then((m) => m.AdminEventsPage) },
          { path: 'events/:id', title: 'Manage event', loadComponent: () => import('./pages/events/event-manage.page').then((m) => m.EventManagePage) },
          { path: 'gallery', title: 'Manage gallery', loadComponent: () => import('./pages/admin/admin-gallery.page').then((m) => m.AdminGalleryPage) },
          { path: 'rewards', title: 'Rewards & badges', loadComponent: () => import('./pages/admin/admin-rewards.page').then((m) => m.AdminRewardsPage) },
          { path: 'analytics', title: 'Analytics', loadComponent: () => import('./pages/admin/admin-analytics.page').then((m) => m.AdminAnalyticsPage) },
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
        ],
      },
    ],
  },
  {
    path: '**',
    component: PublicLayoutComponent,
    children: [{ path: '', title: 'Page not found', loadComponent: () => import('./pages/public/not-found.page').then((m) => m.NotFoundPage) }],
  },
];
