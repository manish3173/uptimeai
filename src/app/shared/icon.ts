import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'activity'
  | 'arrow-right'
  | 'bell'
  | 'briefcase'
  | 'calendar'
  | 'check'
  | 'chevron-down'
  | 'close'
  | 'code'
  | 'dot'
  | 'ellipsis'
  | 'external-link'
  | 'eye'
  | 'github'
  | 'heart'
  | 'info'
  | 'link'
  | 'list'
  | 'location'
  | 'lock'
  | 'organization'
  | 'package'
  | 'people'
  | 'plus'
  | 'project'
  | 'repo'
  | 'repo-forked'
  | 'search'
  | 'sparkles'
  | 'star'
  | 'sync'
  | 'twitter'
  | 'linkedin';

/**
 * Inline SVG icon set (Octicons-inspired, 16×16).
 *
 * Keeping the icons inline avoids an icon-font dependency and lets every
 * glyph inherit `currentColor`, which is how GitHub renders them.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width]': 'sizeStyle()',
    '[style.height]': 'sizeStyle()',
  },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      [class]="svgClass()"
    >
      @switch (name()) {
        @case ('location') {
          <path
            fill="currentColor"
            stroke="none"
            d="m12.596 11.596-3.535 3.536a1.5 1.5 0 0 1-2.122 0l-3.535-3.536a6.5 6.5 0 1 1 9.192-9.193 6.5 6.5 0 0 1 0 9.193Zm-1.06-8.132v-.001a5 5 0 1 0-7.072 7.072L8 14.07l3.536-3.534a5 5 0 0 0 0-7.072ZM8 9a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 9Z"
          />
        }
        @case ('organization') {
          <path
            fill="currentColor"
            stroke="none"
            d="M1.75 16A1.75 1.75 0 0 1 0 14.25V1.75C0 .784.784 0 1.75 0h8.5C11.216 0 12 .784 12 1.75v12.5c0 .085-.006.168-.018.25h2.268a.25.25 0 0 0 .25-.25V8.285a.25.25 0 0 0-.111-.208l-1.055-.703a.749.749 0 1 1 .832-1.248l1.055.703c.487.325.779.871.779 1.456v5.965A1.75 1.75 0 0 1 14.25 16h-3.5a.766.766 0 0 1-.197-.026c-.099.017-.2.026-.303.026h-3a.75.75 0 0 1-.75-.75V14h-1v1.25a.75.75 0 0 1-.75.75Zm-.25-1.75c0 .138.112.25.25.25H4v-1.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h2.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25ZM3.75 6h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM3 3.75A.75.75 0 0 1 3.75 3h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 3 3.75Zm4 3A.75.75 0 0 1 7.75 6h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 7 6.75ZM7.75 3h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM3 9.75A.75.75 0 0 1 3.75 9h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 3 9.75ZM7.75 9h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5Z"
          />
        }
        @case ('link') {
          <path
            fill="currentColor"
            stroke="none"
            d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"
          />
        }
        @case ('twitter') {
          <path
            fill="currentColor"
            stroke="none"
            d="M9.52 6.77 14.42 1h-1.16L8.9 5.91 5.32 1H1.2l5.23 7.61L1.2 15h1.16l4.65-5.32L10.9 15h4.12L9.52 6.77Zm-1.65 1.88-.54-.78L2.66 1.9h1.85l3.75 5.43.54.78 4.5 6.5h-1.85L7.87 8.65Z"
          />
        }
        @case ('linkedin') {
          <path
            fill="currentColor"
            stroke="none"
            d="M3.4 14V6.2h2.4V14H3.4Zm1.2-8.85a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8ZM6.4 14V6.2h2.3v1.06h.03c.33-.6 1.1-1.24 2.28-1.24 2.02 0 2.4 1.3 2.4 3V14h-2.4V9.6c0-1.05-.02-2.4-1.47-2.4-1.47 0-1.7 1.14-1.7 2.32V14H6.4Z"
          />
        }
        @case ('star') {
          <path
            fill="currentColor"
            stroke="none"
            d="M8 .8l2.06 4.18 4.62.67-3.34 3.25.79 4.6L8 11.43 3.87 13.5l.79-4.6L1.32 5.65l4.62-.67L8 .8Z"
          />
        }
        @case ('repo') {
          <path d="M2.5 2.75A1.25 1.25 0 0 1 3.75 1.5h8.5a1.25 1.25 0 0 1 1.25 1.25v10.5A1.25 1.25 0 0 1 12.25 14.5h-8.5A1.25 1.25 0 0 1 2.5 13.25v-10.5Z" />
          <path d="M4.75 5.5h6.5M4.75 8.25h6.5M4.75 11h4" />
        }
        @case ('repo-forked') {
          <circle cx="4.5" cy="3.5" r="2" />
          <circle cx="11.5" cy="12.5" r="2" />
          <path d="M4.5 5.5v2A1.5 1.5 0 0 0 6 9h2.6a1.4 1.4 0 0 1 1.4 1.4v.6" />
          <path d="M11.5 10.5v-2A1.5 1.5 0 0 0 10 7H7.4" />
        }
        @case ('people') {
          <circle cx="6" cy="5" r="2.5" />
          <path d="M1.6 13.8c0-2.4 2-3.9 4.4-3.9s4.4 1.5 4.4 3.9" />
          <circle cx="11.6" cy="5.4" r="2" />
          <path d="M12 10c1.4.5 2.4 1.7 2.4 3.3" />
        }
        @case ('heart') {
          <path d="M8 14S1.6 10.1 1.6 5.9A3.85 3.85 0 0 1 8 3.7a3.85 3.85 0 0 1 6.4 2.2C14.4 10.1 8 14 8 14Z" />
        }
        @case ('github') {
          <path
            fill="currentColor"
            stroke="none"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
        }
        @case ('bell') {
          <path d="M8 1.5a4 4 0 0 0-4 4c0 3-1 4-1.5 4.5h11C13 9.5 12 8.5 12 5.5a4 4 0 0 0-4-4Z" />
          <path d="M6.6 12.6a1.5 1.5 0 0 0 2.8 0" />
        }
        @case ('search') {
          <circle cx="7" cy="7" r="4.6" />
          <path d="M10.6 10.6 14.5 14.5" />
        }
        @case ('plus') {
          <path d="M8 3.25v9.5M3.25 8h9.5" />
        }
        @case ('code') {
          <path d="M5.5 4.25 1.75 8l3.75 3.75M10.5 4.25 14.25 8l-3.75 3.75" />
        }
        @case ('package') {
          <path d="M8 1.6 14.4 5.1v5.8L8 14.4 1.6 10.9V5.1L8 1.6Z" />
          <path d="M1.6 5.1 8 8.6l6.4-3.5M8 8.6v5.8" />
        }
        @case ('project') {
          <rect x="1.75" y="2.5" width="12.5" height="11" rx="1.5" />
          <path d="M1.75 6.5h12.5M6.75 6.5v7" />
        }
        @case ('check') {
          <path d="M3 8.4 6.4 11.8 13 4.6" />
        }
        @case ('chevron-down') {
          <path d="M4 6.25 8 10.25l4-4" />
        }
        @case ('close') {
          <path d="M3.75 3.75l8.5 8.5M12.25 3.75l-8.5 8.5" />
        }
        @case ('sync') {
          <path d="M13.75 8a5.75 5.75 0 1 1-1.85-4.2" />
          <path d="M13.75 1.75v3.4h-3.4" />
        }
        @case ('lock') {
          <rect x="3.25" y="7" width="9.5" height="7" rx="1.5" />
          <path d="M5.6 7V5.1a2.4 2.4 0 0 1 4.8 0V7" />
        }
        @case ('eye') {
          <path d="M1.6 8S4.1 3.6 8 3.6 14.4 8 14.4 8 11.9 12.4 8 12.4 1.6 8 1.6 8Z" />
          <circle cx="8" cy="8" r="1.9" />
        }
        @case ('briefcase') {
          <rect x="1.75" y="4.75" width="12.5" height="8.5" rx="1.5" />
          <path d="M5.6 4.75V3.4A1.4 1.4 0 0 1 7 2h2a1.4 1.4 0 0 1 1.4 1.4v1.35" />
        }
        @case ('list') {
          <path d="M5.75 4h8.25M5.75 8h8.25M5.75 12h8.25M2 4h.01M2 8h.01M2 12h.01" />
        }
        @case ('ellipsis') {
          <circle cx="3.25" cy="8" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="8" cy="8" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="12.75" cy="8" r="1.15" fill="currentColor" stroke="none" />
        }
        @case ('activity') {
          <path d="M1.75 8h3l1.9-4.9 2.9 9.8L11.5 8h2.75" />
        }
        @case ('sparkles') {
          <path d="M8 1.5 9.5 6 14 7.5 9.5 9 8 13.5 6.5 9 2 7.5 6.5 6 8 1.5Z" />
        }
        @case ('arrow-right') {
          <path d="M2.75 8h10.5M9 3.75 13.25 8 9 12.25" />
        }
        @case ('dot') {
          <circle cx="8" cy="8" r="4" fill="currentColor" stroke="none" />
        }
        @case ('info') {
          <circle cx="8" cy="8" r="6.5" />
          <circle cx="8" cy="5" r="0.9" fill="currentColor" stroke="none" />
          <path d="M8 7.5v4" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();

  /**
   * Explicit pixel size. When left unset the icon falls back to the 16px
   * default and callers stay free to size the host through CSS.
   */
  readonly size = input<number | string | null>(null);

  protected readonly svgClass = computed(() => `icon-${this.name()}`);

  protected readonly sizeStyle = computed<string | null>(() => {
    const value = this.size();
    if (value === null || value === undefined) {
      return null;
    }
    return typeof value === 'number' ? `${value}px` : value;
  });
}
