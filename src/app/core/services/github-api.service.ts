import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import {
  ContributionCalendar,
  ContributionDay,
  ContributionsCollection,
  GithubEvent,
  GithubOrg,
  GithubRepo,
  GithubUser,
} from '../models/github.models';
import { GithubTokenService } from './github-token.service';

/** Base URL of the GitHub REST API. */
export const GITHUB_REST_API = 'https://api.github.com';

/** Base URL of the GitHub GraphQL API. */
export const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

/** Path prefix of the bundled REST proxy (`server/server.mjs`). */
const REST_PROXY_PREFIX = '/api/github';

/**
 * Thin wrapper around the GitHub REST API.
 *
 * Reference: https://docs.github.com/en/rest
 *
 * `api.github.com` sends `Access-Control-Allow-Origin: *`, so the calls work
 * straight from the browser. They are still routed through the bundled proxy
 * (`/api/github/*`) first, because the proxy
 *
 * - caches the responses, so reloading the page does not exhaust the
 *   60 requests/hour budget of the unauthenticated API, and
 * - forwards the personal access token when one was configured.
 *
 * If the proxy is not running the app transparently falls back to a direct
 * call to `api.github.com`.
 */
@Injectable({ providedIn: 'root' })
export class GithubApiService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(GithubTokenService);

  /** Headers sent with every REST call. */
  private restHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });

    const token = this.tokens.get();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Perform a REST GET through the local proxy, falling back to a direct
   * call to `api.github.com` when the proxy is unreachable.
   */
  private rest<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    const search = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    const query = search ? `?${search}` : '';
    const headers = this.restHeaders();

    return this.http.get<T>(`${REST_PROXY_PREFIX}${path}${query}`, { headers }).pipe(
      catchError((error: unknown) => {
        if (isProxyUnavailable(error)) {
          return this.http.get<T>(`${GITHUB_REST_API}${path}${query}`, { headers });
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * `GET /users/{username}` — the profile shown in the left panel.
   * https://docs.github.com/en/rest/users/users#get-a-user
   */
  getUser(username: string): Observable<GithubUser> {
    return this.rest<GithubUser>(`/users/${encodeURIComponent(username)}`);
  }

  /** `GET /users/{username}/repos` */
  getRepos(username: string, perPage = 100): Observable<GithubRepo[]> {
    return this.rest<GithubRepo[]>(`/users/${encodeURIComponent(username)}/repos`, {
      per_page: perPage,
      sort: 'updated',
    });
  }

  /** `GET /users/{username}/orgs` */
  getOrgs(username: string): Observable<GithubOrg[]> {
    return this.rest<GithubOrg[]>(`/users/${encodeURIComponent(username)}/orgs`);
  }

  /** `GET /users/{username}/events/public` — powers the recent-activity list. */
  getPublicEvents(username: string, perPage = 30): Observable<GithubEvent[]> {
    return this.rest<GithubEvent[]>(`/users/${encodeURIComponent(username)}/events/public`, {
      per_page: perPage,
    });
  }

  /** `GET /users/{username}/starred` — the "Stars" tab. */
  getStarred(username: string, perPage = 100): Observable<GithubRepo[]> {
    return this.rest<GithubRepo[]>(`/users/${encodeURIComponent(username)}/starred`, {
      per_page: perPage,
    });
  }

  /**
   * Official GitHub GraphQL query for the contribution calendar.
   * Requires a personal access token; see `ContributionService` for the
   * token-free fallback.
   */
  getContributionsCollection(
    username: string,
    from: string,
    to: string,
    token: string,
  ): Observable<ContributionsCollection> {
    // GraphQL requires an explicit range; fall back to the rolling year.
    const today = new Date();
    const defaultFrom = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const defaultTo = today.toISOString().slice(0, 10);
    const start = from || defaultFrom;
    const end = to || defaultTo;

    const query = `
      query Contributions($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }
    `;

    return this.http
      .post<{
        data?: {
          user?: {
            contributionsCollection?: {
              contributionCalendar?: ContributionsCollection;
            };
          };
        };
      }>(
        GITHUB_GRAPHQL_API,
        {
          query,
          variables: { login: username, from: `${start}T00:00:00Z`, to: `${end}T23:59:59Z` },
        },
        {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'UptimeAI-GitHub-Profile',
          }),
        },
      )
      .pipe(
        map((res) => {
          const calendar = res.data?.user?.contributionsCollection?.contributionCalendar;
          if (!calendar) {
            throw new Error('GitHub GraphQL returned no contribution calendar.');
          }
          return calendar;
        }),
      );
  }

  /**
   * Flatten the GraphQL `weeks[].contributionDays[]` structure into the
   * normalised day list used by the heat map.
   */
  static flattenContributionDays(
    weeks: { contributionDays: { date: string; contributionCount: number }[] }[],
  ): ContributionDay[] {
    const days = weeks.flatMap((week) => week.contributionDays);
    return days.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: 0, // levels are computed by the contribution service
    }));
  }

  /** Sum counts and group days by level. */
  static summarise(days: ContributionDay[]): Pick<ContributionCalendar, 'total' | 'levelCounts'> {
    const levelCounts = [0, 0, 0, 0, 0];
    let total = 0;
    for (const day of days) {
      total += day.count;
      const level = Math.min(4, Math.max(0, day.level));
      levelCounts[level] += 1;
    }
    return { total, levelCounts };
  }
}

/**
 * Was the local proxy reachable?
 *
 * - `0`   → the request never left the browser (proxy not running).
 * - `404` → the proxy does not know the route (older server version).
 * - `200` → the proxy answered with something that is not JSON (for example
 *            the SPA fallback of a dev server without the API).
 * - `5xx` → the proxy itself failed: the bundled server answers `502` when
 *            it cannot reach GitHub, and the dev-server proxy answers `500`
 *            when the API process is not running.
 *
 * In all of those cases the app retries straight against `api.github.com`,
 * which sends `Access-Control-Allow-Origin: *` and therefore works from the
 * browser without the Node server.
 */
function isProxyUnavailable(error: unknown): boolean {
  const status = (error as HttpErrorResponse)?.status;
  if (status === 0 || status === 200 || status === 404) {
    return true;
  }
  return typeof status === 'number' && status >= 500;
}
