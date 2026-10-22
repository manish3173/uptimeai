import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { Icon } from './icon';

/**
 * GitHub-style global header navigation.
 *
 * Responsive behaviour:
 * - ≥ 1012px: full nav links + wide search field
 * - 768–1011px: links collapse into the "+" overflow menu, search shrinks
 * - < 768px: search collapses to an icon, nav links hidden
 */
@Component({
  selector: 'app-top-nav',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top-nav">
      <div class="top-nav__inner">
        <button class="top-nav__burger" type="button" aria-label="Open navigation">
          <app-icon name="list" />
        </button>

        <a class="top-nav__logo" href="https://github.com" aria-label="Homepage">
          <app-icon name="github" />
        </a>

        <nav class="top-nav__links" aria-label="Global">
          <a href="https://github.com/pulls">Pull requests</a>
          <a href="https://github.com/issues">Issues</a>
          <a href="https://github.com/marketplace">Marketplace</a>
          <a href="https://github.com/explore">Explore</a>
        </nav>

        <form class="top-nav__search" role="search" (submit)="onSearch($event)">
          <app-icon name="search" />
          <input
            type="search"
            name="q"
            [placeholder]="searchPlaceholder()"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            aria-label="Search GitHub"
          />
          <kbd class="top-nav__search-kbd">/</kbd>
        </form>

        <div class="top-nav__actions">
          <button class="top-nav__icon-btn" type="button" aria-label="Create new">
            <app-icon name="plus" />
          </button>
          <button class="top-nav__icon-btn" type="button" aria-label="Notifications">
            <app-icon name="bell" />
          </button>
          <button class="top-nav__avatar" type="button" aria-label="Your user profile">
            <img [src]="avatarUrl()" [alt]="username()" width="32" height="32" />
          </button>
        </div>
      </div>
    </header>
  `,
  styles: `
    .top-nav {
      background-color: var(--canvas-overlay);
      border-bottom: 1px solid var(--border-default);
      padding: 12px 16px;
    }

    .top-nav__inner {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: var(--container-width);
      margin: 0 auto;
    }

    .top-nav__burger {
      display: none;
    }

    .top-nav__logo {
      display: inline-flex;
      color: var(--fg-default);
      flex-shrink: 0;
    }

    .top-nav__logo:hover {
      text-decoration: none;
      opacity: 0.75;
    }

    .top-nav__logo app-icon {
      width: 32px;
      height: 32px;
    }

    .top-nav__links {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-left: 8px;
    }

    .top-nav__links a {
      color: var(--fg-default);
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }

    .top-nav__links a:hover {
      text-decoration: none;
      color: var(--fg-muted);
    }

    .top-nav__search {
      flex: 1;
      /* Allow the field to shrink below the intrinsic width of the input so
         the header never pushes the page sideways on small screens. */
      min-width: 0;
      max-width: 320px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background-color: var(--canvas-subtle);
      color: var(--fg-muted);
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
    }

    .top-nav__search:focus-within {
      border-color: var(--accent-fg);
      box-shadow: 0 0 0 3px var(--accent-muted);
      background-color: var(--canvas-default);
      outline: none;
    }

    .top-nav__search input {
      flex: 1;
      min-width: 0;
      border: 0;
      background: transparent;
      color: var(--fg-default);
      font-family: inherit;
      font-size: 14px;
      outline: none;
    }

    .top-nav__search-kbd {
      font-family: var(--font-sans);
      font-size: 11px;
      color: var(--fg-subtle);
      border: 1px solid var(--border-default);
      border-radius: 4px;
      padding: 0 5px;
      line-height: 18px;
    }

    .top-nav__actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .top-nav__icon-btn,
    .top-nav__burger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--fg-default);
      cursor: pointer;
    }

    .top-nav__icon-btn:hover,
    .top-nav__burger:hover {
      background-color: var(--canvas-subtle);
    }

    .top-nav__avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid var(--border-default);
      padding: 0;
      margin-left: 4px;
      background: none;
      cursor: pointer;
    }

    .top-nav__avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media (max-width: 1011px) {
      .top-nav__links {
        display: none;
      }
    }

    @media (max-width: 767px) {
      .top-nav {
        padding: 10px 12px;
      }

      .top-nav__burger {
        display: inline-flex;
      }

      .top-nav__search {
        max-width: none;
        padding: 5px 8px;
      }

      .top-nav__search-kbd {
        display: none;
      }
    }
  `,
})
export class TopNav {
  readonly avatarUrl = input('');
  readonly username = input('');
  readonly searchPlaceholder = input('Search or jump to…');
  readonly search = output<string>();

  readonly query = signal('');

  protected onSearch(event: Event): void {
    event.preventDefault();
    this.search.emit(this.query());
  }
}
