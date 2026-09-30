import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Activity } from '../../core/models/api.models';

const ACTIVITY_ICONS: Record<Activity['type'], string> = {
  REPORT: 'megaphone',
  EVENT: 'calendar-check',
  REWARD: 'gift',
  BADGE: 'award',
};

@Component({
  selector: 'app-activity-list',
  imports: [DatePipe, RouterLink, LucideAngularModule],
  template: `
    <section class="card card-body h-full" aria-labelledby="activity-heading">
      <h2 id="activity-heading" class="mb-4 text-base font-semibold">Recent activity</h2>
      @if (items().length) {
        <ol class="space-y-4">
          @for (item of items(); track $index) {
            <li class="flex gap-3">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <lucide-icon [name]="icons[item.type]" [size]="16" aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                @if (item.link) {
                  <a [routerLink]="item.link" class="line-clamp-1 text-sm font-medium hover:text-brand-700">{{ item.title }}</a>
                } @else {
                  <p class="line-clamp-1 text-sm font-medium">{{ item.title }}</p>
                }
                <p class="line-clamp-1 text-xs text-gray-500">{{ item.detail }}</p>
              </div>
              <time class="shrink-0 text-xs text-gray-400" [attr.datetime]="item.date">{{ item.date | date: 'd MMM' }}</time>
            </li>
          }
        </ol>
      } @else {
        <p class="text-sm text-gray-500">Your reports, registrations and rewards will appear here.</p>
      }
    </section>
  `,
})
export class ActivityListComponent {
  readonly items = input<Activity[]>([]);
  protected readonly icons = ACTIVITY_ICONS;
}
