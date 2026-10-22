import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { GithubRepo, languageColor } from '../../core/models/github.models';
import { Icon } from '../../shared/icon';

/**
 * Repository list used by the "Repositories" and "Stars" tabs.
 * Data comes straight from `GET /users/{username}/repos`.
 */
@Component({
  selector: 'app-repo-list',
  imports: [Icon, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="repo-list">
      <div class="repo-list__toolbar">
        <div class="repo-list__search">
          <app-icon name="search" />
          <input
            type="search"
            placeholder="Find a repository…"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            aria-label="Filter repositories"
          />
        </div>
        <select class="repo-list__select" aria-label="Sort repositories" (change)="onSort($event)">
          <option value="updated">Last updated</option>
          <option value="name">Name</option>
          <option value="stars">Stars</option>
        </select>
      </div>

      @if (loading()) {
        <div class="repo-list__state" role="status">Loading repositories…</div>
      } @else if (filtered().length === 0) {
        <div class="repo-list__state">
          <app-icon name="repo" />
          <p>No repositories match “{{ query() }}”.</p>
        </div>
      } @else {
        <ul class="repo-list__items">
          @for (repo of filtered(); track repo.id) {
            <li class="repo-list__item">
              <a class="repo-list__name" [href]="repo.html_url" target="_blank" rel="noopener">
                <app-icon name="repo" />
                <span>{{ repo.name }}</span>
                @if (repo.fork) {
                  <span class="repo-list__tag">Fork</span>
                }
                @if (repo.archived) {
                  <span class="repo-list__tag">Archived</span>
                }
              </a>

              @if (repo.description) {
                <p class="repo-list__desc">{{ repo.description }}</p>
              }

              <div class="repo-list__meta">
                @if (repo.language) {
                  <span class="repo-list__language">
                    <span
                      class="repo-list__lang-dot"
                      [style.background-color]="languageColor(repo.language)"
                    ></span>
                    {{ repo.language }}
                  </span>
                }
                <span class="repo-list__stat">
                  <app-icon name="star" />
                  {{ repo.stargazers_count }}
                </span>
                <span class="repo-list__stat">
                  <app-icon name="repo-forked" />
                  {{ repo.forks_count }}
                </span>
                @if (repo.license?.spdx_id) {
                  <span class="repo-list__stat">{{ repo.license.spdx_id }}</span>
                }
                <span class="repo-list__updated">Updated {{ repo.pushed_at | date: 'MMM d, y' }}</span>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .repo-list__toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .repo-list__search {
      flex: 1;
      min-width: 200px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background-color: var(--canvas-subtle);
      color: var(--fg-muted);
    }

    .repo-list__search:focus-within {
      border-color: var(--accent-fg);
      box-shadow: 0 0 0 3px var(--accent-muted);
      background-color: var(--canvas-default);
      outline: none;
    }

    .repo-list__search input {
      flex: 1;
      min-width: 0;
      border: 0;
      background: transparent;
      font-family: inherit;
      font-size: 14px;
      color: var(--fg-default);
      outline: none;
    }

    .repo-list__select {
      padding: 5px 12px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background-color: var(--canvas-default);
      color: var(--fg-default);
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
    }

    .repo-list__items {
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--border-default);
    }

    .repo-list__item {
      padding: 16px 0;
      border-bottom: 1px solid var(--border-default);
    }

    .repo-list__name {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--accent-fg);
      font-size: 16px;
      font-weight: 600;
    }

    .repo-list__tag {
      padding: 0 7px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-default);
      background-color: var(--canvas-subtle);
      color: var(--fg-muted);
      font-size: 11px;
      font-weight: 500;
    }

    .repo-list__desc {
      margin-top: 6px;
      font-size: 14px;
      color: var(--fg-muted);
      max-width: 70ch;
    }

    .repo-list__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 10px;
      font-size: 12px;
      color: var(--fg-muted);
    }

    .repo-list__language,
    .repo-list__stat {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .repo-list__lang-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .repo-list__updated {
      margin-left: auto;
    }

    .repo-list__state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 48px 16px;
      color: var(--fg-muted);
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-lg);
    }

    @media (max-width: 767px) {
      .repo-list__updated {
        margin-left: 0;
      }
    }
  `,
})
export class RepoList {
  readonly repos = input<GithubRepo[]>([]);
  readonly loading = input(false);

  protected readonly query = signal('');
  protected readonly sort = signal<'updated' | 'name' | 'stars'>('updated');

  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const filtered = term
      ? this.repos().filter(
          (repo) =>
            repo.name.toLowerCase().includes(term) ||
            (repo.description ?? '').toLowerCase().includes(term) ||
            (repo.language ?? '').toLowerCase().includes(term),
        )
      : [...this.repos()];

    switch (this.sort()) {
      case 'name':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'stars':
        return filtered.sort((a, b) => b.stargazers_count - a.stargazers_count);
      default:
        return filtered.sort(
          (a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
        );
    }
  });

  protected languageColor = languageColor;

  protected onSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as 'updated' | 'name' | 'stars');
  }
}
