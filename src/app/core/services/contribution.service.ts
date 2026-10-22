import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import {
  ContributionCalendar,
  ContributionDay,
  ContributionResult,
} from '../models/github.models';
import { GithubApiService } from './github-api.service';

/** Shape returned by the bundled contribution proxy (`server/server.mjs`). */
interface ProxyContributionResponse {
  username: string;
  from: string;
  to: string;
  total: number;
  levelCounts: number[];
  days: ContributionDay[];
  source?: string;
}

/**
 * Loads the GitHub contribution calendar.
 *
 * The live source is the same-origin `/api/contributions/:user` endpoint. In
 * production it is a Vercel function; locally it is handled by the bundled
 * Node server. The server uses `GITHUB_TOKEN` for GraphQL when configured and
 * otherwise falls back to GitHub's public contributions page.
 * If the endpoint fails the app falls back to deterministic mock data so the
 * UI is never empty.
 */
@Injectable({ providedIn: 'root' })
export class ContributionService {
  private readonly http = inject(HttpClient);
  /**
   * Fetch the contribution calendar for `username`.
   *
   * @param from inclusive start date (`YYYY-MM-DD`). When omitted GitHub
   *            returns its rolling "last 12 months" calendar.
   * @param to   inclusive end date (`YYYY-MM-DD`). When omitted GitHub
   *            returns its rolling "last 12 months" calendar.
   */
  load(
    username: string,
    from: string | null = null,
    to: string | null = null,
  ): Observable<ContributionResult> {
    return this.loadFromProxy(username, from, to).pipe(
      catchError(() => of(this.mockResult(username, from, to))),
    );
  }

  /** Source 2 — the bundled proxy that normalises GitHub's calendar page. */
  private loadFromProxy(
    username: string,
    from: string | null,
    to: string | null,
  ): Observable<ContributionResult> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.size ? `?${params.toString()}` : '';

    return this.http
      .get<ProxyContributionResponse>(
        `/api/contributions/${encodeURIComponent(username)}${query}`,
      )
      .pipe(
        map((res) => {
          const days = assignLevels(res.days ?? []);
          const { total, levelCounts } = GithubApiService.summarise(days);
          const calendar: ContributionCalendar = {
            username: res.username || username,
            from: res.from || from || days[0]?.date || '',
            to: res.to || to || days[days.length - 1]?.date || '',
            days,
            total: res.total ?? total,
            levelCounts: res.levelCounts ?? levelCounts,
          };
          return {
            calendar,
            source: res.source === 'graphql' ? ('graphql' as const) : ('rest-proxy' as const),
            label: res.source === 'graphql'
              ? 'GitHub GraphQL API · live calendar'
              : 'GitHub contributions API · live calendar',
          };
        }),
      );
  }

  /** Deterministic offline fallback so the UI always renders. */
  private mockResult(username: string, from: string | null, to: string | null): ContributionResult {
    const today = new Date();
    const start =
      from ?? new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = to ?? today.toISOString().slice(0, 10);
    const days = buildMockDays(start, end);
    const { total, levelCounts } = GithubApiService.summarise(days);
    return {
      calendar: { username, from: start, to: end, days, total, levelCounts },
      source: 'mock',
      label: 'Mock data · offline fallback',
    };
  }
}

/**
 * Assign GitHub-style contribution levels (0–4).
 *
 * GitHub buckets the days with at least one contribution into quartiles and
 * uses those thresholds for levels 1→4. Days without contributions are 0.
 */
export function assignLevels(days: ContributionDay[]): ContributionDay[] {
  const positive = days
    .map((day) => day.count)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);

  if (positive.length === 0) {
    return days.map((day) => ({ ...day, level: 0 }));
  }

  const quartile = (q: number): number => {
    const index = Math.min(
      positive.length - 1,
      Math.max(0, Math.round(q * (positive.length - 1))),
    );
    return positive[index];
  };

  const t1 = quartile(0.25);
  const t2 = quartile(0.5);
  const t3 = quartile(0.75);

  return days.map((day) => {
    if (day.count <= 0) return { ...day, level: 0 };
    // A day already carrying a GitHub-provided level keeps it.
    if (day.level > 0) return day;
    const level = day.count <= t1 ? 1 : day.count <= t2 ? 2 : day.count <= t3 ? 3 : 4;
    return { ...day, level };
  });
}

/** Pseudo-random but stable contribution data for the offline fallback. */
function buildMockDays(from: string, to: string): ContributionDay[] {
  const days: ContributionDay[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  let seed = 0;
  for (const char of `${from}${to}`) seed = (seed * 31 + char.charCodeAt(0)) % 100000;

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    seed = (seed * 9301 + 49297) % 233280;
    const weekend = cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6;
    const base = weekend ? 0.25 : 0.65;
    const count = seed / 233280 > base ? Math.floor((seed / 233280) * 12) : 0;
    days.push({
      date: cursor.toISOString().slice(0, 10),
      count,
      level: 0,
    });
  }
  return assignLevels(days);
}
