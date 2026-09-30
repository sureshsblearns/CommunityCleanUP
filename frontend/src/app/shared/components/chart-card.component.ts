import { Component, computed, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

export interface ChartSeries {
  name: string;
  values: number[];
}

/** Validated categorical order (dataviz reference palette); single-series charts use the brand green. */
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a'];
const BRAND = '#059669';
const GRID = '#eef0ee';
const INK_MUTED = '#6b7280';

/**
 * Card with a Chart.js chart plus an accessible data-table view.
 * Bars are horizontal for category breakdowns (easier to read long labels than pies);
 * lines are used for change over time. One y-axis only; ≥2 series always get a legend.
 */
@Component({
  selector: 'app-chart-card',
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  template: `
    <section class="card card-body flex h-full flex-col" [attr.aria-label]="title()">
      <div class="mb-4">
        <h2 class="text-base font-semibold">{{ title() }}</h2>
        @if (subtitle()) { <p class="text-xs text-gray-500">{{ subtitle() }}</p> }
      </div>
      @if (isEmpty()) {
        <p class="flex flex-1 items-center justify-center py-10 text-sm text-gray-500">No data yet.</p>
      } @else {
        <div class="relative flex-1" [style.min-height.px]="height()">
          <canvas baseChart [type]="type()" [data]="data()" [options]="options()" role="img"
                  [attr.aria-label]="title() + ' chart. A data table follows.'"></canvas>
        </div>
        <details class="mt-3 text-xs text-gray-500">
          <summary class="cursor-pointer font-medium text-brand-700">View as table</summary>
          <div class="table-wrap mt-2">
            <table class="table">
              <thead><tr><th scope="col">{{ categoryLabel() }}</th>@for (s of series(); track s.name) { <th scope="col" class="text-right">{{ s.name }}</th> }</tr></thead>
              <tbody>
                @for (label of labels(); track $index; let i = $index) {
                  <tr><td>{{ label }}</td>@for (s of series(); track s.name) { <td class="text-right tabular-nums">{{ s.values[i] }}</td> }</tr>
                }
              </tbody>
            </table>
          </div>
        </details>
      }
    </section>
  `,
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly type = input<'bar' | 'line'>('bar');
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly height = input(240);
  readonly categoryLabel = input('Category');

  protected readonly isEmpty = computed(() => this.series().every((s) => s.values.every((v) => !v)));

  protected readonly data = computed<ChartData<'bar' | 'line'>>(() => {
    const single = this.series().length === 1;
    return {
      labels: this.labels(),
      datasets: this.series().map((s, i) => {
        const color = single ? BRAND : SERIES_COLORS[i % SERIES_COLORS.length];
        return this.type() === 'line'
          ? {
              label: s.name,
              data: s.values,
              borderColor: color,
              backgroundColor: color,
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              tension: 0,
            }
          : {
              label: s.name,
              data: s.values,
              backgroundColor: color,
              borderRadius: 4,
              borderSkipped: 'start' as const,
              maxBarThickness: 22,
              borderColor: '#ffffff',
              borderWidth: { right: 2, top: 0, bottom: 0, left: 0 },
            };
      }),
    } as ChartData<'bar' | 'line'>;
  });

  protected readonly options = computed<ChartConfiguration<'bar' | 'line'>['options']>(() => {
    const horizontal = this.type() === 'bar';
    const valueAxis = {
      beginAtZero: true,
      grid: { color: GRID },
      border: { display: false },
      ticks: { color: INK_MUTED, precision: 0 },
    };
    const categoryAxis = { grid: { display: false }, border: { display: false }, ticks: { color: INK_MUTED } };
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: this.series().length > 1,
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, boxWidth: 8, color: '#374151' },
        },
        tooltip: { backgroundColor: '#064e3b', padding: 10, cornerRadius: 8 },
      },
      scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
    };
  });
}
