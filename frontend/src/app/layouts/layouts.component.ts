import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { UserAvatarComponent } from '../shared/components/cards.component';
import { LabelPipe } from '../shared/pipes/pipes';
import { FooterComponent } from './footer.component';
import { navFor } from './nav-items';
import { BrandComponent, NavbarComponent } from './navbar.component';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
      Skip to content
    </a>
    <div class="flex min-h-screen flex-col">
      <app-navbar />
      <main id="main" class="flex-1"><router-outlet /></main>
      <app-footer />
    </div>
  `,
})
export class PublicLayoutComponent {}

/** Signed-in shell: role-aware sidebar (collapsible on mobile), top bar and content area. */
@Component({
  selector: 'app-shell-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, BrandComponent, UserAvatarComponent,
    LabelPipe, FooterComponent],
  template: `
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
      Skip to content
    </a>
    <div class="flex min-h-screen">
      @if (sidebarOpen()) {
        <div class="animate-fade-in fixed inset-0 z-40 bg-gray-900/40 lg:hidden" (click)="sidebarOpen.set(false)" aria-hidden="true"></div>
      }
      <aside class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-gray-100 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
             [class.-translate-x-full]="!sidebarOpen()" aria-label="Sidebar">
        <div class="flex h-16 items-center justify-between px-5">
          <app-brand />
          <button type="button" class="btn btn-ghost p-1.5 lg:hidden" (click)="sidebarOpen.set(false)" aria-label="Close menu">
            <lucide-icon name="x" [size]="20" aria-hidden="true" />
          </button>
        </div>
        <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
          @for (section of sections(); track $index) {
            <div>
              @if (section.title) {
                <p class="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">{{ section.title }}</p>
              }
              <ul class="space-y-1">
                @for (item of section.items; track item.link) {
                  <li>
                    <a [routerLink]="item.link" routerLinkActive="nav-link-active" [routerLinkActiveOptions]="{ exact: !!item.exact }"
                       class="nav-link flex items-center gap-3">
                      <lucide-icon [name]="item.icon" [size]="18" aria-hidden="true" /> {{ item.label }}
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
          <div>
            <p class="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Community</p>
            <ul class="space-y-1">
              <li><a routerLink="/gallery" class="nav-link flex items-center gap-3"><lucide-icon name="image" [size]="18" aria-hidden="true" /> Gallery</a></li>
              <li><a routerLink="/" class="nav-link flex items-center gap-3"><lucide-icon name="globe" [size]="18" aria-hidden="true" /> Public site</a></li>
            </ul>
          </div>
        </nav>
        @if (auth.user(); as user) {
          <div class="border-t border-gray-100 p-3">
            <a routerLink="/profile" class="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
              <app-user-avatar [name]="user.name" [size]="36" />
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ user.name }}</p>
                <p class="text-xs text-gray-500">{{ user.role | label }}@if (user.role === 'VOLUNTEER' || user.role === 'RESIDENT') { · {{ user.points }} pts }</p>
              </div>
            </a>
            <button type="button" class="nav-link mt-1 flex w-full items-center gap-3 text-red-600 hover:bg-red-50" (click)="auth.logout()">
              <lucide-icon name="log-out" [size]="18" aria-hidden="true" /> Log out
            </button>
          </div>
        }
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-100 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button type="button" class="btn btn-ghost p-2" (click)="sidebarOpen.set(true)" aria-label="Open menu"
                  [attr.aria-expanded]="sidebarOpen()">
            <lucide-icon name="menu" [size]="22" aria-hidden="true" />
          </button>
          <app-brand />
        </header>
        <main id="main" class="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div class="mx-auto max-w-7xl"><router-outlet /></div>
        </main>
        <app-footer />
      </div>
    </div>
  `,
})
export class ShellLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly sidebarOpen = signal(false);
  protected readonly sections = computed(() => (this.auth.role() ? navFor(this.auth.role()!) : []));

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.sidebarOpen.set(false));
  }
}
