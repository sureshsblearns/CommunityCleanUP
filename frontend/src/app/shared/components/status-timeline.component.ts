import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ReportStatus, StatusHistory } from '../../core/models/api.models';
import { label } from '../../core/utils/labels';

const FLOW: ReportStatus[] = ['PENDING', 'VERIFIED', 'CLEANING_SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
const ICONS: Record<string, string> = {
  PENDING: 'clock',
  VERIFIED: 'shield-check',
  CLEANING_SCHEDULED: 'calendar-check',
  IN_PROGRESS: 'sparkles',
  COMPLETED: 'circle-check',
};

interface Step {
  status: ReportStatus;
  label: string;
  icon: string;
  state: 'done' | 'current' | 'upcoming';
  entry?: StatusHistory;
}

/** Visual progress through the report lifecycle plus the full audit history. */
@Component({
  selector: 'app-status-timeline',
  imports: [DatePipe, LucideAngularModule],
  template: `
    @if (terminal()) {
      <div class="mb-5 flex items-start gap-3 rounded-xl p-4"
           [class]="status() === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-700'" role="status">
        <lucide-icon [name]="status() === 'REJECTED' ? 'circle-x' : 'ban'" [size]="20" class="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p class="font-semibold">This report was {{ status() === 'REJECTED' ? 'rejected' : 'cancelled' }}.</p>
          @if (lastComment()) { <p class="mt-0.5 text-sm">Reason: {{ lastComment() }}</p> }
        </div>
      </div>
    }

    <ol class="relative space-y-0" aria-label="Report progress">
      @for (step of steps(); track step.status; let last = $last) {
        <li class="relative flex gap-4 pb-6" [class.pb-0]="last">
          @if (!last) {
            <span class="absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5"
                  [class]="step.state === 'done' ? 'bg-brand-500' : 'bg-gray-200'" aria-hidden="true"></span>
          }
          <span class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white"
                [class]="step.state === 'done' ? 'bg-brand-600 text-white' : step.state === 'current' ? 'bg-brand-100 text-brand-700 ring-brand-50' : 'bg-gray-100 text-gray-400'">
            <lucide-icon [name]="step.state === 'done' ? 'check' : step.icon" [size]="17" aria-hidden="true" />
          </span>
          <div class="min-w-0 pt-1.5">
            <p class="text-sm font-semibold" [class]="step.state === 'upcoming' ? 'text-gray-400' : 'text-gray-900'">
              {{ step.label }}
              <span class="sr-only">({{ step.state === 'done' ? 'completed' : step.state === 'current' ? 'current step' : 'not reached yet' }})</span>
            </p>
            @if (step.entry) {
              <p class="text-xs text-gray-500">{{ step.entry.changedAt | date: 'medium' }} · by {{ step.entry.changedBy }}</p>
              @if (step.entry.comment) { <p class="mt-1 text-sm text-gray-600">{{ step.entry.comment }}</p> }
            }
          </div>
        </li>
      }
    </ol>
  `,
})
export class StatusTimelineComponent {
  readonly status = input.required<ReportStatus>();
  readonly history = input<StatusHistory[]>([]);

  protected readonly terminal = computed(() => this.status() === 'REJECTED' || this.status() === 'CANCELLED');
  protected readonly lastComment = computed(() => [...this.history()].reverse().find((h) => h.comment)?.comment);

  protected readonly steps = computed<Step[]>(() => {
    const history = this.history();
    const current = this.status();
    // For rejected/cancelled reports, show how far the report got before it stopped.
    const reached = this.terminal()
      ? Math.max(0, ...history.map((h) => FLOW.indexOf(h.newStatus)))
      : FLOW.indexOf(current);
    const stateOf = (i: number): Step['state'] => {
      if (i < reached || (i === reached && (this.terminal() || current === 'COMPLETED'))) return 'done';
      return i === reached ? 'current' : 'upcoming';
    };
    return FLOW.map((status, i) => ({
      status,
      label: label(status),
      icon: ICONS[status],
      state: stateOf(i),
      entry: [...history].reverse().find((h) => h.newStatus === status),
    }));
  });
}
