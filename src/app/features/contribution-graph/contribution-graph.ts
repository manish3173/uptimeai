import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { CalendarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import {
  ContributionCalendar,
  ContributionDay,
} from '../../core/models/github.models';
import { Icon } from '../../shared/icon';

echarts.use([
  CalendarComponent,
  HeatmapChart,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

/** GitHub's green contribution palette, level 0 → 4. */
const LEVEL_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

/** GitHub only labels Monday, Wednesday and Friday. */
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const MS_PER_DAY = 86400000;

/**
 * Pitch of a single day cell, in pixels.
 *
 * GitHub draws 10×10px squares that are separated by a 3px gap, so the cells
 * sit on a 13px grid. The squares themselves are produced by giving every
 * cell a 3px border in the background colour, which leaves a 10px square.
 */
const CELL_SIZE = 13;

/** Gutter on the left that holds the weekday labels. */
const CALENDAR_LEFT = 34;

/** Gutter on the top that holds the month labels. */
const CALENDAR_TOP = 22;

/** Colour of the gap between two day cells — the background of the card. */
const CELL_GAP_COLOR = '#ffffff';

/** Seven weekday rows. */
const CALENDAR_HEIGHT = 7 * CELL_SIZE;

/**
 * ECharts emits one month label per month boundary of the range, but it also
 * emits a label for the first day of the range itself. When the range starts
 * in the middle of a month both entries describe the same month, so the label
 * ends up drawn twice — the second one a few columns to the left, on top of
 * the weekday gutter.
 *
 * The formatter keeps a single label per month: an empty string hides the
 * duplicated entry. The calendar is re-rendered whenever it is resized, which
 * replays the same sequence of labels, so a key that goes backwards in time
 * marks the start of a new pass and resets the state.
 */
function createMonthLabelFormatter(): (params: {
  nameMap: string;
  yyyy: string;
  yy: string;
  MM: string;
  M: number;
}) => string {
  let previous = '';

  return (params) => {
    const key = `${params.yyyy}-${params.MM}`;

    if (previous && key < previous) {
      previous = '';
    }

    if (key === previous) {
      return '';
    }

    previous = key;
    return params.nameMap;
  };
}

/** First and last day covered by `days`. */
function calendarRange(days: ContributionDay[]): { from: string; to: string } {
  let first = Number.POSITIVE_INFINITY;
  let last = Number.NEGATIVE_INFINITY;

  for (const day of days) {
    const time = toUtcTime(day.date);
    if (time < first) first = time;
    if (time > last) last = time;
  }

  return { from: toIsoDate(first), to: toIsoDate(last) };
}

/** Number of week columns ECharts reserves for the given period. */
function countWeeks(from: string, to: string): number {
  const start = toUtcTime(from);
  const end = toUtcTime(to);
  const allDays = Math.round((end - start) / MS_PER_DAY) + 1;
  const startDay = new Date(start).getUTCDay();

  return Math.floor((allDays + startDay + 6) / 7);
}

/**
 * Contribution heat map, drawn with Apache ECharts on a calendar coordinate
 * system. The grid is laid out exactly like github.com: one column per week,
 * one row per weekday, and the first and last column are only partially
 * filled because the period rarely starts on a Sunday.
 */
@Component({
  selector: 'app-contribution-graph',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="contrib">
      <div class="contrib__head">
        <h2 class="contrib__title">{{ title() }}</h2>

        <div class="contrib__controls">
          <span class="contrib__year-wrap">
            <select
              class="contrib__year"
              [value]="year()"
              (change)="onYearChange($event)"
              aria-label="Contribution year"
            >
              @for (option of years(); track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
            <app-icon name="chevron-down" class="contrib__chevron" />
          </span>
          <button
            type="button"
            class="contrib__refresh"
            (click)="refresh.emit()"
            aria-label="Refresh contributions"
          >
            <app-icon name="sync" />
          </button>
        </div>
      </div>

      <div class="contrib-card">
        @if (loading()) {
          <div class="contrib-card__state" role="status">Loading contributions…</div>
        } @else if (!calendar()) {
          <div class="contrib-card__state">No contribution data available.</div>
        } @else {
          <div class="contrib-card__chart-scroll">
            <div
              class="contrib-card__chart"
              #chartHost
              [style.min-width.px]="chartWidth()"
              [style.height.px]="chartHeight"
            ></div>
          </div>

          <div class="contrib-card__footer">
            <a
              class="contrib-card__learn"
              href="https://docs.github.com/en/get-started/exploring-projects-on-github/understanding-contributions"
              target="_blank"
              rel="noopener"
              >Learn how we count contributions</a
            >

            <div class="contrib-card__legend">
              <span>Less</span>
              @for (color of levelColors; track $index) {
                <span class="contrib-card__legend-cell" [style.background-color]="color"></span>
              }
              <span>More</span>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .contrib__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .contrib__title {
      font-size: 16px;
      font-weight: 400;
      color: var(--fg-default);
    }

    .contrib__controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .contrib__year-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .contrib__year {
      appearance: none;
      padding: 3px 28px 3px 10px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background-color: var(--canvas-default);
      color: var(--fg-default);
      font-family: inherit;
      font-size: 12px;
      line-height: 20px;
      cursor: pointer;
    }

    .contrib__chevron {
      position: absolute;
      pointer-events: none;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      color: var(--fg-muted);
    }

    .contrib__refresh {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background-color: var(--canvas-default);
      color: var(--fg-muted);
      cursor: pointer;
    }

    .contrib__refresh:hover {
      background-color: var(--canvas-subtle);
      color: var(--fg-default);
    }

    /* The card is the top half of the panel that GitHub splits between the
       calendar and the activity overview below it. */
    .contrib-card {
      border: 1px solid var(--border-default);
      border-bottom: 0;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      background-color: var(--canvas-overlay);
      padding: 8px 0 0;
      overflow: hidden;
    }

    .contrib-card__chart-scroll {
      overflow-x: auto;
      margin: 0 8px;
      padding-top: 4px;
    }

    .contrib-card__chart {
      width: 100%;
    }

    .contrib-card__state {
      padding: 48px 16px;
      text-align: center;
      color: var(--fg-muted);
    }

    .contrib-card__link {
      margin-top: 8px;
      border: 0;
      background: none;
      color: var(--accent-fg);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .contrib-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 4px 32px;
      font-size: 12px;
      color: var(--fg-muted);
    }

    .contrib-card__learn {
      color: var(--fg-muted);
      font-size: 12px;
    }

    .contrib-card__learn:hover {
      color: var(--accent-fg);
      text-decoration: underline;
    }

    .contrib-card__legend {
      display: flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
      font-size: 12px;
      color: var(--fg-muted);
    }

    .contrib-card__legend-cell {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      border: 0.5px solid rgba(1, 4, 9, 0.05);
    }

    @media (max-width: 767px) {
      .contrib-card__footer {
        padding: 4px 16px;
      }
    }
  `,
})
export class ContributionGraph implements AfterViewInit, OnChanges, OnDestroy {
  readonly calendar = input<ContributionCalendar | null>(null);
  readonly loading = input(false);
  readonly years = input<number[]>([]);
  readonly selectedYear = input<number | null>(null);

  readonly yearChange = output<number>();
  readonly refresh = output<void>();

  protected readonly levelColors = LEVEL_COLORS;
  protected readonly chartHeight = CALENDAR_TOP + CALENDAR_HEIGHT;

  private readonly chartHost = viewChild<ElementRef<HTMLDivElement>>('chartHost');
  private chart?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;
  private chartElement?: HTMLDivElement;

  protected readonly year = signal<number | null>(null);

  /** Width the calendar needs so that the last week column is not clipped. */
  protected readonly chartWidth = computed(() => {
    const calendar = this.calendar();
    if (!calendar || calendar.days.length === 0) {
      return CALENDAR_LEFT;
    }

    const range = calendarRange(calendar.days);
    return CALENDAR_LEFT + countWeeks(range.from, range.to) * CELL_SIZE;
  });

  protected readonly title = computed(() => {
    const calendar = this.calendar();

    if (!calendar) {
      return 'Contributions';
    }

    const total = calendar.total.toLocaleString('en-US');
    const year = this.selectedYear();
    const currentYear = new Date().getUTCFullYear();

    // GitHub keeps the rolling twelve months for the current year because
    // the calendar year is still running.
    if (!year || year === currentYear) {
      return `${total} contributions in the last year`;
    }

    return `${total} contributions in ${year}`;
  });

  constructor() {
    effect(() => {
      this.chartHost();
      this.calendar();
      this.year();
      queueMicrotask(() => this.render());
    });
  }

  ngAfterViewInit(): void {
    this.render();

    const host = this.chartHost();
    if (host) {
      this.observeChartHost(host.nativeElement);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['calendar'] && this.chart) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  protected onYearChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (Number.isFinite(value)) {
      this.year.set(value);
      this.yearChange.emit(value);
    }
  }

  private render(): void {
    const host = this.chartHost();
    const calendar = this.calendar();

    if (!host || !calendar || calendar.days.length === 0) {
      return;
    }

    const element = host.nativeElement;
    if (this.chartElement !== element) {
      this.resizeObserver?.disconnect();
      this.resizeObserver = undefined;
      this.chart?.dispose();
      this.chart = undefined;
      this.chartElement = element;
    }

    if (!this.chart) {
      this.chart = echarts.init(element, undefined, { renderer: 'canvas' });
      this.observeChartHost(element);
    }

    const chart = this.chart;
    const days = calendar.days;
    const counts = new Map<string, number>(days.map((day) => [day.date, day.count]));
    const range = calendarRange(days);

    chart.setOption(
      {
        animation: false,
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: '#1f2328',
          borderWidth: 0,
          textStyle: { color: '#ffffff', fontSize: 12 },
          extraCssText: 'border-radius:6px;box-shadow:0 3px 6px rgba(140,149,159,0.25);',
          formatter: (params: { value?: unknown }) => {
            const value = params.value as [string | number, number] | undefined;
            if (!value) {
              return '';
            }

            const date = typeof value[0] === 'number' ? toIsoDate(value[0]) : value[0];
            return tooltipText(counts.get(date) ?? 0, date);
          },
        },
        visualMap: {
          show: false,
          type: 'piecewise',
          dimension: 1,
          pieces: LEVEL_COLORS.map((color, level) => ({ value: level, color })),
        },
        calendar: {
          top: CALENDAR_TOP,
          left: CALENDAR_LEFT,
          orient: 'horizontal',
          cellSize: [CELL_SIZE, CELL_SIZE],
          range: [range.from, range.to],
          splitLine: { show: false },
          itemStyle: { color: 'transparent', borderWidth: 0, borderColor: 'transparent' },
          yearLabel: { show: false },
          monthLabel: {
            show: true,
            nameMap: 'EN',
            align: 'left',
            color: '#59636e',
            fontSize: 12,
            margin: 8,
            formatter: createMonthLabelFormatter(),
          },
          dayLabel: {
            show: true,
            firstDay: 0,
            nameMap: DAY_LABELS,
            color: '#59636e',
            fontSize: 12,
            margin: 8,
          },
        },
        series: [
          {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: days.map((day) => [day.date, day.level]),
            itemStyle: {
              // A 3px border in the background colour turns the 13px cell
              // into the 10px square GitHub draws, with the gap in between.
              borderWidth: 3,
              borderColor: CELL_GAP_COLOR,
              borderRadius: 2,
            },
            emphasis: {
              itemStyle: {
                borderWidth: 3,
                borderColor: '#818b98',
              },
            },
            progressive: 0,
            z: 5,
          },
        ],
      },
      { notMerge: true },
    );

    chart.resize();
  }

  private observeChartHost(element: HTMLDivElement): void {
    if (this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(element);
  }
}

/** Parses an `YYYY-MM-DD` string as a UTC timestamp. */
function toUtcTime(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

/** Formats a UTC timestamp as an `YYYY-MM-DD` string. */
function toIsoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Tooltip body for a single day cell. */
function tooltipText(count: number, date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  const label = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });

  const contributions = count === 1 ? '1 contribution' : `${count} contributions`;
  return `<strong>${contributions}</strong><br />${label}`;
}
