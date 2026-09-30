import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Badge, Certificate, EventSummary, ReportSummary } from '../../core/models/api.models';
import { BADGE_ICONS } from '../../core/utils/labels';
import { LabelPipe, ThumbPipe, Time12Pipe } from '../pipes/pipes';
import { StatusBadgeComponent } from './status-badge.component';

@Component({
  selector: 'app-report-card',
  imports: [RouterLink, DatePipe, LucideAngularModule, StatusBadgeComponent, LabelPipe, ThumbPipe],
  template: `
    <a [routerLink]="[linkBase(), report().id]" class="card card-hover group flex h-full flex-col overflow-hidden">
      <div class="relative aspect-[16/10] overflow-hidden bg-brand-50">
        @if (report().thumbnailUrl) {
          <img [src]="report().thumbnailUrl | thumb: 480 : 300" [alt]="'Photo of ' + report().title" loading="lazy"
               class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        } @else {
          <div class="flex h-full items-center justify-center text-brand-300">
            <lucide-icon name="image" [size]="36" aria-hidden="true" />
          </div>
        }
        <div class="absolute left-3 top-3"><app-status-badge [value]="report().status" /></div>
      </div>
      <div class="flex flex-1 flex-col gap-2 p-4">
        <h3 class="line-clamp-2 text-base font-semibold leading-snug">{{ report().title }}</h3>
        <p class="flex items-start gap-1.5 text-sm text-gray-500">
          <lucide-icon name="map-pin" [size]="15" class="mt-0.5 shrink-0" aria-hidden="true" />
          <span class="line-clamp-1">{{ report().location }}</span>
        </p>
        <div class="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span class="chip bg-gray-50 text-gray-700 ring-gray-200">{{ report().wasteType | label }}</span>
          <app-status-badge [value]="report().urgency" />
          <span class="ml-auto text-gray-400">{{ report().createdDate | date: 'mediumDate' }}</span>
        </div>
      </div>
    </a>
  `,
})
export class ReportCardComponent {
  readonly report = input.required<ReportSummary>();
  readonly linkBase = input('/reports');
}

@Component({
  selector: 'app-event-card',
  imports: [RouterLink, DatePipe, LucideAngularModule, StatusBadgeComponent, ThumbPipe, Time12Pipe],
  template: `
    <a [routerLink]="[linkBase(), event().id]" class="card card-hover group flex h-full flex-col overflow-hidden">
      <div class="relative aspect-[16/9] overflow-hidden bg-brand-100">
        @if (event().coverImageUrl) {
          <img [src]="event().coverImageUrl | thumb: 520 : 300" [alt]="event().title" loading="lazy"
               class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        } @else {
          <div class="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-brand-600">
            <lucide-icon name="leaf" [size]="40" aria-hidden="true" />
          </div>
        }
        <div class="absolute left-3 top-3"><app-status-badge [value]="event().status" /></div>
        <div class="absolute bottom-3 right-3 rounded-lg bg-white/95 px-2.5 py-1.5 text-center shadow-sm">
          <p class="text-[10px] font-bold uppercase leading-none text-brand-600">{{ event().eventDate | date: 'MMM' }}</p>
          <p class="font-display text-lg font-bold leading-tight text-brand-950">{{ event().eventDate | date: 'd' }}</p>
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-2 p-4">
        <h3 class="line-clamp-2 text-base font-semibold leading-snug">{{ event().title }}</h3>
        <p class="text-xs font-medium text-brand-700">{{ event().organizerName }}</p>
        <div class="space-y-1 text-sm text-gray-500">
          <p class="flex items-center gap-1.5">
            <lucide-icon name="clock" [size]="14" aria-hidden="true" />
            {{ event().eventDate | date: 'EEE, d MMM' }} · {{ event().startTime | time12 }}
          </p>
          <p class="flex items-start gap-1.5">
            <lucide-icon name="map-pin" [size]="14" class="mt-0.5 shrink-0" aria-hidden="true" />
            <span class="line-clamp-1">{{ event().location }}</span>
          </p>
        </div>
        <div class="mt-auto pt-3">
          <div class="mb-1 flex justify-between text-xs text-gray-500">
            <span>{{ event().registeredCount }} / {{ event().volunteersRequired }} volunteers</span>
            <span>{{ percent() }}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar"
               [attr.aria-valuenow]="event().registeredCount" [attr.aria-valuemax]="event().volunteersRequired"
               aria-label="Volunteer registrations">
            <div class="h-full rounded-full bg-brand-500 transition-all" [style.width.%]="percent()"></div>
          </div>
        </div>
      </div>
    </a>
  `,
})
export class EventCardComponent {
  readonly event = input.required<EventSummary>();
  readonly linkBase = input('/events');
  protected readonly percent = computed(() =>
    Math.min(100, Math.round((this.event().registeredCount / Math.max(1, this.event().volunteersRequired)) * 100)),
  );
}

@Component({
  selector: 'app-badge-card',
  imports: [DatePipe, LucideAngularModule],
  template: `
    <div class="card flex h-full flex-col items-center p-5 text-center transition"
         [class.opacity-60]="!badge().earned" [attr.aria-label]="badge().name + (badge().earned ? ' (earned)' : ' (locked)')">
      <div class="mb-3 flex h-16 w-16 items-center justify-center rounded-full"
           [class]="badge().earned ? 'bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-200' : 'bg-gray-100 text-gray-400'">
        <lucide-icon [name]="icon()" [size]="28" aria-hidden="true" />
      </div>
      <h3 class="text-sm font-semibold">{{ badge().name }}</h3>
      <p class="mt-1 text-xs text-gray-500">{{ badge().description }}</p>
      <p class="mt-auto pt-3 text-xs font-medium" [class]="badge().earned ? 'text-brand-700' : 'text-gray-400'">
        @if (badge().earned) {
          <lucide-icon name="badge-check" [size]="13" class="inline align-[-2px]" aria-hidden="true" />
          Earned {{ badge().awardedDate | date: 'mediumDate' }}
        } @else {
          <lucide-icon name="lock" [size]="12" class="inline align-[-2px]" aria-hidden="true" /> Locked
        }
      </p>
    </div>
  `,
})
export class BadgeCardComponent {
  readonly badge = input.required<Badge>();
  protected readonly icon = computed(() => BADGE_ICONS[this.badge().type] ?? 'award');
}

@Component({
  selector: 'app-certificate-card',
  imports: [DatePipe, LucideAngularModule, RouterLink],
  template: `
    <div class="card relative flex h-full flex-col overflow-hidden">
      <div class="h-1.5 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-800"></div>
      <div class="flex flex-1 flex-col p-5">
        <div class="mb-3 flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <lucide-icon name="award" [size]="22" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">Certificate of Participation</p>
            <p class="font-mono text-xs text-gray-500">{{ certificate().certificateNumber }}</p>
          </div>
        </div>
        <a [routerLink]="['/events', certificate().eventId]" class="text-base font-semibold hover:text-brand-700">
          {{ certificate().eventTitle }}
        </a>
        <p class="mt-1 text-sm text-gray-500">{{ certificate().eventDate | date: 'longDate' }} · {{ certificate().organizerName }}</p>
        <p class="mt-1 line-clamp-1 text-xs text-gray-400">{{ certificate().eventLocation }}</p>
        <div class="mt-auto flex items-center justify-between pt-4">
          <span class="text-xs text-gray-400">Issued {{ certificate().issuedAt | date: 'mediumDate' }}</span>
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class CertificateCardComponent {
  readonly certificate = input.required<Certificate>();
}

@Component({
  selector: 'app-user-avatar',
  template: `
    <span class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
          [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.38"
          [style.background]="color()" [attr.aria-label]="name()" role="img">
      {{ initials() }}
    </span>
  `,
})
export class UserAvatarComponent {
  readonly name = input.required<string>();
  readonly size = input(36);
  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join(''),
  );
  protected readonly color = computed(() => {
    const palette = ['#047857', '#0f766e', '#15803d', '#0369a1', '#7c3aed', '#b45309', '#be123c'];
    const hash = [...this.name()].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return palette[hash % palette.length];
  });
}
