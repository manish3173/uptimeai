import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PinnedRepo } from '../../core/models/github.models';
import { Icon } from '../../shared/icon';

/** The "Popular repositories" grid on the overview tab. */
@Component({
  selector: 'app-pinned-repos',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pinned">
      <h2 class="pinned__heading">Popular repositories</h2>

      @if (repos().length === 0) {
        <div class="pinned__empty">No popular repositories yet.</div>
      } @else {
        <ul class="pinned__grid">
          @for (repo of repos(); track repo.name) {
            <li class="pinned__item">
              <article class="pinned__card">
                <div class="pinned__card-head">
                  <a class="pinned__name" [href]="'https://github.com/' + repo.name" target="_blank" rel="noopener">
                    <app-icon name="repo" />
                    <span>{{ repo.name }}</span>
                  </a>
                  <span class="pinned__visibility">{{ repo.isPublic ? 'Public' : 'Private' }}</span>
                </div>

                @if (repo.forkedFrom) {
                  <p class="pinned__fork">
                    Forked from
                    <a [href]="'https://github.com/' + repo.forkedFrom" target="_blank" rel="noopener">{{
                      repo.forkedFrom
                    }}</a>
                  </p>
                }

                <p class="pinned__desc">{{ repo.description || 'No description provided.' }}</p>

                <p class="pinned__meta">
                  @if (repo.language) {
                    <span class="pinned__language">
                      <span class="pinned__lang-dot" [style.background-color]="repo.languageColor"></span>
                      {{ repo.language }}
                    </span>
                  }
                  @if (repo.stars) {
                    <span class="pinned__stat">
                      <app-icon name="star" />
                      {{ repo.stars }}
                    </span>
                  }
                  @if (repo.forks) {
                    <span class="pinned__stat">
                      <app-icon name="repo-forked" />
                      {{ repo.forks }}
                    </span>
                  }
                </p>
              </article>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .pinned {
      margin-bottom: 24px;
    }

    .pinned__heading {
      font-size: 16px;
      font-weight: 400;
      margin-bottom: 8px;
    }

    .pinned__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .pinned__card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      padding: 16px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      background-color: var(--canvas-overlay);
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
    }

    .pinned__card:hover {
      border-color: var(--border-default);
      box-shadow: var(--shadow-sm);
    }

    .pinned__card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .pinned__name {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      color: var(--accent-fg);
      font-size: 14px;
      font-weight: 600;
    }

    .pinned__name span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pinned__visibility {
      flex-shrink: 0;
      padding: 0 7px;
      border-radius: var(--radius-pill);
      background-color: var(--canvas-subtle);
      border: 1px solid var(--border-default);
      font-size: 12px;
      font-weight: 500;
      color: var(--fg-muted);
    }

    .pinned__fork {
      font-size: 12px;
      color: var(--fg-muted);
    }

    .pinned__fork a {
      color: var(--accent-fg);
    }

    .pinned__desc {
      font-size: 12px;
      line-height: 1.5;
      color: var(--fg-muted);
      flex: 1;
    }

    .pinned__meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      color: var(--fg-muted);
    }

    .pinned__language {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .pinned__lang-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--fg-subtle);
    }

    .pinned__stat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .pinned__empty {
      padding: 24px;
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-lg);
      text-align: center;
      color: var(--fg-muted);
    }

    @media (max-width: 767px) {
      .pinned__grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class PinnedRepos {
  readonly repos = input<PinnedRepo[]>([]);
}
