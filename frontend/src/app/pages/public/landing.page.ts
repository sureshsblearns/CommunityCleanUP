import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PublicStats } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { EventService } from '../../core/services/event.service';
import { GalleryService } from '../../core/services/gallery.service';
import { createLoader } from '../../core/utils/loader';
import { BeforeAfterComponent } from '../../shared/components/before-after.component';
import { EventCardComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent } from '../../shared/components/feedback-states.component';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=1400&q=80&auto=format&fit=crop';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, LucideAngularModule, DecimalPipe, EventCardComponent, BeforeAfterComponent, EmptyStateComponent],
  template: `
    <!-- Hero -->
    <section class="relative overflow-hidden bg-brand-950 text-white">
      <img [src]="heroImage" alt="" class="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div class="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/90 to-brand-950/40" aria-hidden="true"></div>
      <div class="container-page relative grid gap-10 py-20 sm:py-28 lg:grid-cols-12 lg:py-32">
        <div class="lg:col-span-7">
          <p class="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200 ring-1 ring-white/15">
            <lucide-icon name="sprout" [size]="14" aria-hidden="true" /> A neighbourhood-powered cleanup network
          </p>
          <h1 class="font-display text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            Report. Organize.<br /><span class="text-brand-300">Clean. Together.</span>
          </h1>
          <p class="mt-6 max-w-xl text-lg text-brand-100/90">
            Spot a dirty public area? Report it with a photo and location. Local NGOs turn verified reports into
            cleanup events, and volunteers earn points, badges and certificates for showing up.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a [routerLink]="reportLink()" class="btn btn-primary btn-lg bg-brand-500 hover:bg-brand-400">
              <lucide-icon name="megaphone" [size]="18" aria-hidden="true" /> Report an Issue
            </a>
            <a routerLink="/events" class="btn btn-lg bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20">
              <lucide-icon name="hand-heart" [size]="18" aria-hidden="true" /> Join a Cleanup
            </a>
          </div>
        </div>
        <div class="hidden lg:col-span-5 lg:flex lg:items-end lg:justify-end">
          <div class="w-full max-w-sm rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
            <p class="text-xs font-semibold uppercase tracking-wider text-brand-200">Live community impact</p>
            @if (stats.data(); as s) {
              <dl class="mt-4 grid grid-cols-2 gap-4">
                <div><dt class="text-xs text-brand-100/80">Areas cleaned</dt><dd class="font-display text-3xl font-bold">{{ s.areasCleaned | number }}</dd></div>
                <div><dt class="text-xs text-brand-100/80">Volunteer turn-outs</dt><dd class="font-display text-3xl font-bold">{{ s.attendances | number }}</dd></div>
                <div><dt class="text-xs text-brand-100/80">Reports filed</dt><dd class="font-display text-3xl font-bold">{{ s.reportsSubmitted | number }}</dd></div>
                <div><dt class="text-xs text-brand-100/80">Upcoming events</dt><dd class="font-display text-3xl font-bold">{{ s.upcomingEvents | number }}</dd></div>
              </dl>
            } @else {
              <p class="mt-4 text-sm text-brand-100/80">Statistics will appear once the server is reachable.</p>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- Problem -->
    <section class="container-page py-16 sm:py-20">
      <div class="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p class="eyebrow">The problem</p>
          <h2 class="section-title mt-2">Litter piles up when nobody knows who should act</h2>
          <p class="mt-4 text-gray-600">
            Overflowing bins, dumped construction debris and plastic along rivers are reported in scattered WhatsApp
            groups and phone calls — and then forgotten. Residents lack a simple way to flag problems, NGOs lack a
            verified list of where help is needed, and volunteers rarely get recognised for their time.
          </p>
          <p class="mt-3 text-gray-600">
            Community Clean-Up Portal connects all three: every report is tracked from submission to a completed
            cleanup, with photos proving the difference.
          </p>
        </div>
        <ul class="grid gap-4 sm:grid-cols-2">
          @for (item of problems; track item.title) {
            <li class="card card-body">
              <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <lucide-icon [name]="item.icon" [size]="20" aria-hidden="true" />
              </div>
              <h3 class="text-base font-semibold">{{ item.title }}</h3>
              <p class="mt-1 text-sm text-gray-500">{{ item.text }}</p>
            </li>
          }
        </ul>
      </div>
    </section>

    <!-- How it works -->
    <section id="how-it-works" class="bg-white py-16 sm:py-20">
      <div class="container-page">
        <div class="mx-auto max-w-2xl text-center">
          <p class="eyebrow">How it works</p>
          <h2 class="section-title mt-2">From a photo to a clean street in four steps</h2>
        </div>
        <ol class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          @for (step of steps; track step.title; let i = $index) {
            <li class="relative rounded-2xl border border-brand-100 bg-brand-50/40 p-6">
              <span class="absolute -top-3 left-6 rounded-full bg-brand-700 px-2.5 py-0.5 text-xs font-bold text-white">Step {{ i + 1 }}</span>
              <lucide-icon [name]="step.icon" [size]="28" class="text-brand-600" aria-hidden="true" />
              <h3 class="mt-4 text-lg font-semibold">{{ step.title }}</h3>
              <p class="mt-2 text-sm text-gray-600">{{ step.text }}</p>
            </li>
          }
        </ol>
      </div>
    </section>

    <!-- Features -->
    <section class="container-page py-16 sm:py-20">
      <div class="mx-auto max-w-2xl text-center">
        <p class="eyebrow">Features</p>
        <h2 class="section-title mt-2">Everything a community cleanup needs</h2>
      </div>
      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (feature of features; track feature.title) {
          <div class="card card-body card-hover">
            <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-900 text-brand-300">
              <lucide-icon [name]="feature.icon" [size]="22" aria-hidden="true" />
            </div>
            <h3 class="text-base font-semibold">{{ feature.title }}</h3>
            <p class="mt-1.5 text-sm text-gray-500">{{ feature.text }}</p>
          </div>
        }
      </div>
    </section>

    <!-- Impact -->
    <section class="bg-brand-900 py-14 text-white">
      <div class="container-page">
        <div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
          <h2 class="text-2xl font-bold text-white">Community impact</h2>
          <p class="text-xs text-brand-200">Calculated live from portal data</p>
        </div>
        @if (stats.data(); as s) {
          <dl class="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            @for (item of impact(s); track item.label) {
              <div class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <dt class="text-xs text-brand-200">{{ item.label }}</dt>
                <dd class="mt-1 font-display text-3xl font-bold">{{ item.value | number }}</dd>
              </div>
            }
          </dl>
        } @else if (stats.loading()) {
          <div class="mt-8 grid grid-cols-2 gap-6 md:grid-cols-6">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="h-20 animate-pulse rounded-xl bg-white/10"></div> }
          </div>
        } @else {
          <p class="mt-6 text-sm text-brand-200">Impact statistics are temporarily unavailable.</p>
        }
      </div>
    </section>

    <!-- Upcoming events -->
    <section class="container-page py-16 sm:py-20">
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p class="eyebrow">Get involved</p>
          <h2 class="section-title mt-2">Upcoming cleanup events</h2>
        </div>
        <a routerLink="/events" class="btn btn-secondary">View all events <lucide-icon name="arrow-right" [size]="16" aria-hidden="true" /></a>
      </div>
      <div class="mt-8">
        @if (events.loading()) {
          <div class="grid gap-6 md:grid-cols-3">
            @for (i of [1, 2, 3]; track i) { <div class="skeleton h-80"></div> }
          </div>
        } @else if (events.data()?.length) {
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (event of events.data(); track event.id) { <app-event-card [event]="event" /> }
          </div>
        } @else {
          <app-empty-state icon="calendar" title="No upcoming events right now"
                           message="New cleanups are announced regularly — check back soon or create an NGO account to organise one." />
        }
      </div>
    </section>

    <!-- Gallery preview -->
    <section class="bg-white py-16 sm:py-20">
      <div class="container-page">
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p class="eyebrow">Community gallery</p>
            <h2 class="section-title mt-2">See the difference we make</h2>
            <p class="mt-2 text-gray-500">Drag the slider to compare before and after.</p>
          </div>
          <a routerLink="/gallery" class="btn btn-secondary">Open gallery <lucide-icon name="arrow-right" [size]="16" aria-hidden="true" /></a>
        </div>
        <div class="mt-8">
          @if (gallery.loading()) {
            <div class="grid gap-6 md:grid-cols-3">@for (i of [1, 2, 3]; track i) { <div class="skeleton aspect-[4/3]"></div> }</div>
          } @else if (gallery.data()?.content?.length) {
            <div class="grid gap-6 md:grid-cols-3">
              @for (item of gallery.data()!.content; track item.id) {
                <figure>
                  <app-before-after [before]="item.beforeImageUrl" [after]="item.afterImageUrl" [title]="item.title" [width]="600" [height]="450" />
                  <figcaption class="mt-3">
                    <p class="font-semibold">{{ item.title }}</p>
                    <p class="text-sm text-gray-500">{{ item.location }}</p>
                  </figcaption>
                </figure>
              }
            </div>
          } @else {
            <app-empty-state icon="image" title="The gallery is waiting for its first cleanup" />
          }
        </div>
      </div>
    </section>

    <!-- CTAs -->
    <section class="container-page grid gap-6 py-16 sm:py-20 lg:grid-cols-2">
      <div class="relative overflow-hidden rounded-3xl bg-brand-700 p-8 text-white sm:p-10">
        <lucide-icon name="hand-heart" [size]="120" class="absolute -bottom-6 -right-6 text-white/10" aria-hidden="true" />
        <h2 class="text-2xl font-bold text-white">Become a volunteer</h2>
        <p class="mt-2 max-w-md text-brand-100">Join cleanups near you, earn 50 points per attended event, unlock badges and download participation certificates.</p>
        <a [routerLink]="auth.isAuthenticated() ? '/events' : '/register'" [queryParams]="auth.isAuthenticated() ? null : { role: 'VOLUNTEER' }"
           class="btn btn-lg mt-6 bg-white text-brand-800 hover:bg-brand-50">Join a Cleanup</a>
      </div>
      <div class="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-50 p-8 sm:p-10">
        <lucide-icon name="megaphone" [size]="120" class="absolute -bottom-6 -right-6 text-brand-200/60" aria-hidden="true" />
        <h2 class="text-2xl font-bold">Seen a dirty area?</h2>
        <p class="mt-2 max-w-md text-gray-600">Snap a photo, drop a pin on the map and we'll route it to the right organisers. Track progress until it's clean.</p>
        <a [routerLink]="reportLink()" class="btn btn-primary btn-lg mt-6">Report an Issue</a>
        <p class="mt-4 text-sm text-gray-500">
          Are you an NGO? <a [routerLink]="'/register'" [queryParams]="{ role: 'NGO' }" class="font-semibold text-brand-700 hover:underline">Register your organisation</a>
          to organise cleanups for verified reports.
        </p>
      </div>
    </section>
  `,
})
export class LandingPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly eventService = inject(EventService);
  private readonly galleryService = inject(GalleryService);

  protected readonly heroImage = HERO_IMAGE;
  protected readonly stats = createLoader(() => this.dashboardService.publicStats());
  protected readonly events = createLoader(() => this.eventService.upcomingPublic(3));
  protected readonly gallery = createLoader(() => this.galleryService.list(0, 3));

  protected readonly problems = [
    { icon: 'triangle-alert', title: 'Unreported hotspots', text: 'Dumping grounds grow because nobody knows they exist.' },
    { icon: 'users', title: 'Scattered volunteers', text: 'People want to help but cannot find organised efforts.' },
    { icon: 'clipboard-list', title: 'No accountability', text: 'Complaints disappear with no status or follow-up.' },
    { icon: 'heart', title: 'Unrecognised effort', text: 'Volunteers rarely receive credit for their contribution.' },
  ];

  protected readonly steps = [
    { icon: 'camera', title: 'Report', text: 'Residents upload photos, pick the spot on a map and describe the waste.' },
    { icon: 'shield-check', title: 'Verify', text: 'Administrators review each report and verify genuine issues.' },
    { icon: 'calendar-check', title: 'Organise', text: 'NGOs schedule cleanup events for verified reports and invite volunteers.' },
    { icon: 'sparkles', title: 'Clean & celebrate', text: 'Volunteers attend, earn points and badges, and the area is marked clean.' },
  ];

  protected readonly features = [
    { icon: 'map-pin', title: 'Map-based reporting', text: 'Drop a pin with Google Maps, add photos, waste type and urgency.' },
    { icon: 'activity', title: 'Live status tracking', text: 'Follow every report from Pending to Completed with a full timeline.' },
    { icon: 'calendar-days', title: 'Cleanup events', text: 'NGOs publish events with capacity limits and manage attendance.' },
    { icon: 'trophy', title: 'Points & leaderboard', text: 'Earn points for confirmed attendance and climb the leaderboard.' },
    { icon: 'award', title: 'Badges & certificates', text: 'Unlock achievement badges and download PDF participation certificates.' },
    { icon: 'image', title: 'Before/after gallery', text: 'Celebrate completed cleanups with side-by-side photo comparisons.' },
  ];

  ngOnInit(): void {
    this.stats.load();
    this.events.load();
    this.gallery.load();
  }

  protected reportLink(): string {
    return this.auth.isAuthenticated() ? '/reports/create' : '/login';
  }

  protected impact(s: PublicStats) {
    return [
      { label: 'Reports submitted', value: s.reportsSubmitted },
      { label: 'Areas cleaned', value: s.areasCleaned },
      { label: 'Events completed', value: s.eventsCompleted },
      { label: 'Upcoming events', value: s.upcomingEvents },
      { label: 'Registered volunteers', value: s.volunteers },
      { label: 'Volunteer turn-outs', value: s.attendances },
    ];
  }
}
