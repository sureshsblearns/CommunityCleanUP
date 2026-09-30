import { Component, computed, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-pagination',
  imports: [LucideAngularModule],
  template: `
    @if (totalPages() > 1) {
      <nav class="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
        <p class="text-sm text-gray-500">
          Showing <span class="font-medium text-gray-700">{{ from() }}–{{ to() }}</span> of
          <span class="font-medium text-gray-700">{{ totalElements() }}</span>
        </p>
        <div class="flex items-center gap-1">
          <button type="button" class="btn btn-secondary btn-sm" [disabled]="page() === 0"
                  (click)="pageChange.emit(page() - 1)" aria-label="Previous page">
            <lucide-icon name="chevron-left" [size]="16" aria-hidden="true" />
          </button>
          @for (p of pages(); track $index) {
            @if (p === -1) {
              <span class="px-2 text-gray-400">…</span>
            } @else {
              <button type="button" class="btn btn-sm min-w-9"
                      [class]="p === page() ? 'btn btn-sm min-w-9 bg-brand-600 text-white' : 'btn btn-sm min-w-9 btn-ghost'"
                      [attr.aria-current]="p === page() ? 'page' : null" (click)="pageChange.emit(p)">
                {{ p + 1 }}
              </button>
            }
          }
          <button type="button" class="btn btn-secondary btn-sm" [disabled]="page() >= totalPages() - 1"
                  (click)="pageChange.emit(page() + 1)" aria-label="Next page">
            <lucide-icon name="chevron-right" [size]="16" aria-hidden="true" />
          </button>
        </div>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input(0);
  readonly size = input(10);
  readonly pageChange = output<number>();

  protected readonly from = computed(() => this.page() * this.size() + 1);
  protected readonly to = computed(() => Math.min(this.totalElements(), (this.page() + 1) * this.size()));

  /** Page numbers with -1 placeholders for gaps, e.g. [0, -1, 4, 5, 6, -1, 12]. */
  protected readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const set = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total));
    const sorted = [...set].sort((a, b) => a - b);
    const result: number[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) result.push(-1);
      result.push(p);
    });
    return result;
  });
}
