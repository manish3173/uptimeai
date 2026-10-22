import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon, IconName } from '../../shared/icon';

export type ProfileTabId = 'overview' | 'repositories' | 'projects' | 'packages' | 'stars';

export interface ProfileTab {
  id: ProfileTabId;
  label: string;
  icon?: IconName;
  /** Optional trailing counter, e.g. the number of repositories. */
  count?: number;
}

/**
 * Underline style tab bar, mirroring github.com.
 * Horizontally scrollable on narrow viewports.
 */
@Component({
  selector: 'app-profile-tabs',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="tabs" role="tablist" aria-label="Profile sections">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          class="tabs__tab"
          [class.tabs__tab--active]="tab.id === activeTab()"
          [attr.aria-selected]="tab.id === activeTab()"
          (click)="tabChange.emit(tab.id)"
        >
          @if (tab.icon) {
            <app-icon [name]="tab.icon" />
          }
          <span>{{ tab.label }}</span>
          @if (tab.count !== undefined && tab.count !== null) {
            <span class="tabs__count">{{ tab.count }}</span>
          }
        </button>
      }
    </nav>
  `,
  styles: `
    .tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow-x: auto;
      scrollbar-width: none;
      border-bottom: 1px solid var(--border-default);
      margin-bottom: 24px;
      padding-bottom: 0;
    }

    .tabs::-webkit-scrollbar {
      display: none;
    }

    .tabs__tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 8px 10px;
      margin-bottom: -1px;
      border: 0;
      border-bottom: 2px solid transparent;
      background: none;
      color: var(--fg-muted);
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
    }

    .tabs__tab:hover {
      color: var(--fg-default);
      border-bottom-color: var(--border-default);
    }

    .tabs__tab--active {
      color: var(--fg-default);
      font-weight: 600;
      border-bottom-color: #fd8c73;
    }

    .tabs__tab--active:hover {
      border-bottom-color: #fd8c73;
    }

    .tabs__count {
      font-size: 12px;
      color: var(--fg-muted);
      font-weight: 400;
    }
  `,
})
export class ProfileTabs {
  readonly tabs = input.required<ProfileTab[]>();
  readonly activeTab = input.required<ProfileTabId>();
  readonly tabChange = output<ProfileTabId>();
}
