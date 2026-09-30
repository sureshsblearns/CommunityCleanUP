import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/services/auth.service';
import { LabelPipe } from '../shared/pipes/pipes';
import { UserAvatarComponent } from '../shared/components/cards.component';

@Component({
  selector: 'app-brand',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <a routerLink="/" class="flex items-center gap-2.5" aria-label="Community Clean-Up Portal home">
      <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-brand-300 shadow-sm">
        <lucide-icon name="leaf" [size]="20" aria-hidden="true" />
      </span>
      <span class="whitespace-nowrap font-display text-base font-extrabold leading-tight text-brand-950">
        Community <span class="text-brand-600">Clean-Up</span>
      </span>
    </a>
  `,
})
export class BrandComponent {}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, BrandComponent, UserAvatarComponent, LabelPipe],
  template: `
    <header class="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <nav class="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
        <app-brand />

        <div class="hidden items-center gap-1 md:flex">
          @for (link of links; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="nav-link-active" [routerLinkActiveOptions]="{ exact: link.path === '/' }"
               class="nav-link">{{ link.label }}</a>
          }
        </div>

        <div class="hidden items-center gap-2 md:flex">
          @if (auth.user(); as user) {
            <a [routerLink]="auth.homeRoute()" class="btn btn-secondary btn-sm">
              <lucide-icon name="layout-dashboard" [size]="15" aria-hidden="true" /> Dashboard
            </a>
            <div class="relative">
              <button type="button" class="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-gray-100"
                      (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-haspopup="menu"
                      aria-label="Account menu">
                <app-user-avatar [name]="user.name" [size]="32" />
                <lucide-icon name="chevron-down" [size]="14" class="text-gray-500" aria-hidden="true" />
              </button>
              @if (menuOpen()) {
                <div class="animate-fade-in absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl" role="menu">
                  <div class="border-b border-gray-100 px-3 py-2">
                    <p class="truncate text-sm font-semibold">{{ user.name }}</p>
                    <p class="text-xs text-gray-500">{{ user.role | label }}</p>
                  </div>
                  <a routerLink="/profile" class="nav-link flex items-center gap-2" role="menuitem" (click)="menuOpen.set(false)">
                    <lucide-icon name="user" [size]="15" aria-hidden="true" /> Profile
                  </a>
                  <button type="button" class="nav-link flex w-full items-center gap-2 text-left text-red-600 hover:bg-red-50 hover:text-red-700"
                          role="menuitem" (click)="logout()">
                    <lucide-icon name="log-out" [size]="15" aria-hidden="true" /> Log out
                  </button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/login" class="btn btn-ghost btn-sm">Log in</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Join the community</a>
          }
        </div>

        <button type="button" class="btn btn-ghost p-2 md:hidden" (click)="mobileOpen.set(!mobileOpen())"
                [attr.aria-expanded]="mobileOpen()" aria-controls="mobile-menu" aria-label="Toggle menu">
          <lucide-icon [name]="mobileOpen() ? 'x' : 'menu'" [size]="22" aria-hidden="true" />
        </button>
      </nav>

      @if (mobileOpen()) {
        <div id="mobile-menu" class="animate-fade-in border-t border-gray-100 bg-white md:hidden">
          <div class="container-page flex flex-col gap-1 py-3">
            @for (link of links; track link.path) {
              <a [routerLink]="link.path" routerLinkActive="nav-link-active" [routerLinkActiveOptions]="{ exact: link.path === '/' }"
                 class="nav-link">{{ link.label }}</a>
            }
            <div class="mt-2 grid gap-2 border-t border-gray-100 pt-3">
              @if (auth.user()) {
                <a [routerLink]="auth.homeRoute()" class="btn btn-primary">Go to dashboard</a>
                <a routerLink="/profile" class="btn btn-secondary">Profile</a>
                <button type="button" class="btn btn-ghost text-red-600" (click)="logout()">Log out</button>
              } @else {
                <a routerLink="/register" class="btn btn-primary">Join the community</a>
                <a routerLink="/login" class="btn btn-secondary">Log in</a>
              }
            </div>
          </div>
        </div>
      }
    </header>
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly links = [
    { label: 'Home', path: '/' },
    { label: 'Events', path: '/events' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'About', path: '/about' },
  ];

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.menuOpen.set(false);
        this.mobileOpen.set(false);
      });
  }

  @HostListener('document:keydown.escape')
  protected closeMenus(): void {
    this.menuOpen.set(false);
    this.mobileOpen.set(false);
  }

  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }
}
