import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  computed,
  input,
  viewChild,
} from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { ContributionCalendar, GithubEvent } from '../../core/models/github.models';
import { Icon, IconName } from '../../shared/icon';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface MonthlyBucket {
  label: string;
  count: number;
}

/** One row of the "Activity overview" panel. */
interface ActivityCategory {
  label: string;
  icon: IconName;
  count: number;
  /** Share of the activity, 0 → 100. */
  percentage: number;
}

/**
 * How the public event stream maps onto the four categories GitHub shows.
 *
 * @see https://docs.github.com/en/rest/activity/events
 */
const CATEGORIES: { label: string; icon: IconName; types: string[] }[] = [
  {
    label: 'Code review',
    icon: 'code',
    types: ['PullRequestReviewEvent', 'PullRequestReviewCommentEvent'],
  },
  { label: 'Issues', icon: 'info', types: ['IssuesEvent', 'IssueCommentEvent'] },
  { label: 'Pull requests', icon: 'repo-forked', types: ['PullRequestEvent'] },
  { label: 'Commits', icon: 'activity', types: ['PushEvent', 'CommitCommentEvent'] },
];

/**
 * "Activity overview" panel.
 *
 * The four categories (code review, issues, pull requests and commits) are
 * derived from the public event stream of the user
 * (`GET /users/{username}/events/public`), exactly like the panel GitHub
 * renders on a profile page. The "Contribution activity" chart below it is
 * built from the contribution calendar.
 */
@Component({
  selector: 'app-activity-overview',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="activity">
      <!-- Bottom half of the panel that starts with the calendar. -->
      <div class="activity__box">
        <h3 class="activity__heading">Activity overview</h3>

        @if (categories().length) {
          <ul class="activity__list">
            @for (category of categories(); track category.label) {
              <li class="activity__row">
                <app-icon [name]="category.icon" class="activity__icon" />
                <span class="activity__label">{{ category.label }}</span>
                <span class="activity__count">{{ category.count }}</span>
                <span class="activity__percent">{{ category.percentage }}%</span>
                <span class="activity__bar">
                  <span class="activity__bar-fill" [style.width.%]="category.percentage"></span>
                </span>
              </li>
            }
          </ul>
        } @else {
          <p class="activity__empty">No public activity to show yet.</p>
        }
      </div>

      <h2 class="activity__chart-title">Contribution activity</h2>

      <div class="activity__chart-card">
        <h3 class="activity__chart-month">{{ monthLabel() }}</h3>
        <div class="activity__chart" #chartHost></div>
      </div>
    </section>
  `,
  styles: `
    .activity {
      margin-bottom: 0;
    }

    /* ---------- Activity overview box -------------------------------------- */

    .activity__box {
      border: 1px solid var(--border-default);
      border-top: 0;
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      background-color: var(--canvas-overlay);
      padding: 16px;
      margin-bottom: 32px;
    }

    .activity__heading {
      font-size: 14px;
      font-weight: 400;
      margin-bottom: 16px;
    }

    .activity__list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .activity__row {
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr) auto auto;
      align-items: center;
      column-gap: 8px;
      row-gap: 4px;
    }

    .activity__icon {
      color: var(--fg-muted);
    }

    .activity__label {
      font-size: 14px;
      color: var(--fg-default);
    }

    .activity__count {
      font-size: 12px;
      color: var(--fg-muted);
    }

    .activity__percent {
      font-size: 12px;
      font-weight: 600;
      color: var(--fg-default);
      min-width: 34px;
      text-align: right;
    }

    .activity__bar {
      grid-column: 2 / -1;
      display: block;
      height: 6px;
      border-radius: var(--radius-pill);
      background-color: var(--canvas-subtle);
      overflow: hidden;
    }

    .activity__bar-fill {
      display: block;
      height: 100%;
      border-radius: var(--radius-pill);
      background-color: var(--contrib-level-3);
    }

    .activity__empty {
      font-size: 14px;
      color: var(--fg-muted);
    }

    /* ---------- Contribution activity ------------------------------------- */

    .activity__chart-title {
      font-size: 16px;
      font-weight: 400;
      margin-top: 24px;
      margin-bottom: 16px;
    }

    .activity__chart-card {
      padding: 0 0 16px;
    }

    .activity__chart-month {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 8px 4px 0;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--border-default);
    }

    .activity__chart {
      width: 100%;
      height: 180px;
    }
  `,
})
export class ActivityOverview implements AfterViewInit, OnChanges, OnDestroy {
  readonly calendar = input<ContributionCalendar | null>(null);

  /** Public event stream of the user — `GET /users/{username}/events/public`. */
  readonly events = input<GithubEvent[]>([]);

  private readonly chartHost = viewChild.required<ElementRef<HTMLDivElement>>('chartHost');
  private chart?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;

  /** The four categories GitHub shows, with their share of the activity. */
  protected readonly categories = computed<ActivityCategory[]>(() => {
    const events = this.events();
    if (!events.length) {
      return [];
    }

    const counts = CATEGORIES.map((category) => ({
      label: category.label,
      icon: category.icon,
      count: events.filter((event) => category.types.includes(event.type)).length,
    }));

    const total = counts.reduce((sum, category) => sum + category.count, 0);

    return counts.map((category) => ({
      ...category,
      percentage: total > 0 ? Math.round((category.count / total) * 100) : 0,
    }));
  });

  /** Label of the month the chart ends in, e.g. `October 2026`. */
  protected readonly monthLabel = computed(() => {
    const buckets = this.monthlyBuckets();
    const last = buckets[buckets.length - 1];
    if (!last) {
      return '';
    }

    const calendar = this.calendar();
    const end = calendar?.to;
    if (!end) {
      return last.label;
    }

    return new Date(`${end}T00:00:00Z`).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  });

  protected readonly monthlyBuckets = computed<MonthlyBucket[]>(() => {
    const calendar = this.calendar();
    if (!calendar) return [];

    const monthly = new Map<string, number>();
    for (const day of calendar.days) {
      const key = day.date.slice(0, 7);
      monthly.set(key, (monthly.get(key) ?? 0) + day.count);
    }

    return [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        label: new Date(`${key}-01T00:00:00`).toLocaleString('en-US', { month: 'short' }),
        count,
      }));
  });

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartHost().nativeElement, undefined, { renderer: 'canvas' });
    this.render();

    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(this.chartHost().nativeElement);
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

  private render(): void {
    if (!this.chart) return;

    const buckets = this.monthlyBuckets();
    if (buckets.length === 0) {
      this.chart.clear();
      return;
    }

    this.chart.setOption(
      {
        animation: true,
        grid: { top: 8, right: 8, bottom: 24, left: 8 },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#1f2328',
          borderWidth: 0,
          textStyle: { color: '#ffffff', fontSize: 12 },
          extraCssText: 'border-radius:6px;box-shadow:0 3px 6px rgba(140,149,159,0.25);',
        },
        xAxis: {
          type: 'category',
          data: buckets.map((bucket) => bucket.label),
          axisLine: { lineStyle: { color: '#d0d7de' } },
          axisTick: { show: false },
          axisLabel: { color: '#59636e', fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          show: false,
          splitLine: { show: false },
        },
        series: [
          {
            type: 'bar',
            data: buckets.map((bucket) => bucket.count),
            barMaxWidth: 34,
            itemStyle: { color: '#40c463', borderRadius: [4, 4, 0, 0] },
            emphasis: { itemStyle: { color: '#30a14e' } },
          },
        ],
      },
      { notMerge: true },
    );

    this.chart.resize();
  }
}
