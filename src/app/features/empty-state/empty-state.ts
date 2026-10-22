import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon, IconName } from '../../shared/icon';

/** Shared empty-state panel used by the Projects / Packages tabs. */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <div class="empty-state__icon">
        <app-icon [name]="icon()" />
      </div>
      <h2 class="empty-state__title">{{ title() }}</h2>
      <p class="empty-state__text">{{ description() }}</p>
      @if (hint()) {
        <p class="empty-state__hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 64px 24px;
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-lg);
      background-color: var(--canvas-subtle);
      text-align: center;
    }

    .empty-state__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: var(--canvas-overlay);
      border: 1px solid var(--border-default);
      color: var(--fg-muted);
      margin-bottom: 4px;
    }

    .empty-state__title {
      font-size: 16px;
      font-weight: 600;
    }

    .empty-state__text {
      font-size: 14px;
      color: var(--fg-muted);
      max-width: 52ch;
    }

    .empty-state__hint {
      font-size: 12px;
      color: var(--fg-subtle);
    }
  `,
})
export class EmptyState {
  readonly icon = input<IconName>('project');
  readonly title = input('Nothing here yet');
  readonly description = input('');
  readonly hint = input('');
}
