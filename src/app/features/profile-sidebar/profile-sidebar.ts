import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { Achievement, GithubOrg, GithubUser } from '../../core/models/github.models';
import { Icon } from '../../shared/icon';
import { FOOTER_LINKS, PROFILE_FALLBACKS } from '../../core/data/mock-data';

/**
 * Left-hand profile panel.
 *
 * Everything shown here is driven by `GET /users/{username}`
 * (https://docs.github.com/en/rest/users/users#get-a-user) plus the
 * organisations endpoint. Only the achievements, the profile status and the
 * LinkedIn handle — which the public REST API does not expose — fall back to
 * mock data.
 *
 * The markup mirrors the layout of github.com: a circular avatar, the display
 * name, the handle, a follow button, the bio, the follower counters, the
 * organisation badges, the meta list, the achievements and finally the
 * "Block or report user" action.
 */
@Component({
  selector: 'app-profile-sidebar',
  imports: [Icon, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="profile-sidebar">
      <div class="profile-sidebar__inner">
        <!-- Avatar + profile status ---------------------------------------->
        <div class="profile-sidebar__avatar-wrap">
          @if (user(); as u) {
            <img
              class="profile-sidebar__avatar"
              [src]="u.avatar_url"
              [alt]="u.name || u.login"
              width="256"
              height="256"
              (error)="onAvatarError($event)"
            />
          } @else {
            <div class="profile-sidebar__avatar profile-sidebar__avatar--skeleton"></div>
          }

          @if (status()) {
            <span class="profile-sidebar__status" [title]="status()">
              <span class="profile-sidebar__status-emoji">{{ statusEmoji() }}</span>
              <span class="profile-sidebar__status-text">{{ statusText() }}</span>
            </span>
          }
        </div>

        <!-- Identity --------------------------------------------------------->
        <div class="profile-sidebar__identity">
          <h1 class="profile-sidebar__name">{{ user()?.name || user()?.login || '—' }}</h1>
          <div class="profile-sidebar__handle">
            <span>{{ user()?.login || 'loading' }}</span>
            @if (isVerified()) {
              <span class="profile-sidebar__verified" title="Verified">
                <app-icon name="check" />
              </span>
            }
          </div>
        </div>

        <!-- Follow ----------------------------------------------------------->
        <button
          type="button"
          class="profile-sidebar__follow"
          [class.profile-sidebar__follow--active]="following()"
          (click)="toggleFollow()"
        >
          {{ following() ? 'Following' : 'Follow' }}
        </button>

        <!-- Bio -------------------------------------------------------------->
        @if (user()?.bio) {
          <p class="profile-sidebar__bio">{{ user()?.bio }}</p>
        }

        <!-- Followers / following -------------------------------------------->
        <p class="profile-sidebar__followers">
          <a href="https://github.com/{{ user()?.login }}?tab=followers" target="_blank" rel="noopener">
            {{ (user()?.followers ?? 0) | number }} followers
          </a>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/{{ user()?.login }}?tab=following" target="_blank" rel="noopener">
            {{ (user()?.following ?? 0) | number }} following
          </a>
        </p>

        <!-- Organisations ---------------------------------------------------->
        @if (orgs().length) {
          <ul class="profile-sidebar__orgs">
            @for (org of orgs(); track org.id) {
              <li>
                <a class="profile-sidebar__org" [href]="org.html_url" target="_blank" rel="noopener">
                  <img [src]="org.avatar_url" [alt]="org.login" width="18" height="18" />
                  <span>{{ org.login }}</span>
                </a>
              </li>
            }
          </ul>
        }

        <!-- Meta list -------------------------------------------------------->
        <ul class="profile-sidebar__meta">
          @if (user()?.location) {
            <li>
              <app-icon name="location" />
              <span>{{ user()?.location }}</span>
            </li>
          }
          @if (user()?.company) {
            <li>
              <app-icon name="organization" />
              <span>{{ user()?.company }}</span>
            </li>
          }
          @if (user()?.blog) {
            <li>
              <app-icon name="link" />
              <a [href]="blogUrl()" target="_blank" rel="noopener">{{ displayBlog() }}</a>
            </li>
          }
          @if (linkedinHandle()) {
            <li>
              <app-icon name="linkedin" />
              <a
                [href]="'https://www.linkedin.com/in/' + linkedinHandle()"
                target="_blank"
                rel="noopener"
                >in/{{ linkedinHandle() }}</a
              >
            </li>
          }
          @if (user()?.twitter_username) {
            <li>
              <app-icon name="twitter" />
              <a
                [href]="'https://twitter.com/' + user()?.twitter_username"
                target="_blank"
                rel="noopener"
                >&#64;{{ user()?.twitter_username }}</a
              >
            </li>
          }
        </ul>

        <!-- Achievements ------------------------------------------------------>
        @if (achievements().length) {
          <section class="profile-sidebar__achievements">
            <div class="profile-sidebar__achievements-head">
              <h2>Achievements</h2>
              <button
                type="button"
                class="profile-sidebar__link-btn"
                (click)="showAllAchievements.set(!showAllAchievements())"
              >
                {{ showAllAchievements() ? 'Show less' : 'x' + visibleAchievements().length }}
              </button>
            </div>
            <div class="profile-sidebar__badges">
              @for (achievement of visibleAchievements(); track achievement.id) {
                <a
                  class="profile-sidebar__badge"
                  [href]="'https://github.com/' + user()?.login + '?achievement=' + achievement.id"
                  [title]="achievement.title"
                >
                  <img [src]="achievement.imageUrl" [alt]="achievement.title" width="48" height="48" />
                </a>
              }
            </div>
          </section>
        }

        <!-- Report ---------------------------------------------------------->
        <button type="button" class="profile-sidebar__report">
          Block or report user
        </button>
      </div>

      <!-- Footer ----------------------------------------------------------->
      <footer class="profile-footer">
        <ul>
          @for (link of footerLinks; track link.label) {
            <li><a [href]="link.href" target="_blank" rel="noopener">{{ link.label }}</a></li>
          }
        </ul>
      </footer>
    </aside>
  `,
  styles: `
    .profile-sidebar {
      display: flex;
      flex-direction: column;
      gap: 24px;
      min-width: 0;
    }

    .profile-sidebar__inner {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    /* ---------- Avatar ---------------------------------------------------- */

    .profile-sidebar__avatar-wrap {
      position: relative;
      width: 100%;
    }

    .profile-sidebar__avatar {
      width: 100%;
      height: auto;
      aspect-ratio: 1 / 1;
      /* github.com renders the profile picture as a circle. */
      border-radius: 50%;
      border: 1px solid var(--border-default);
      background-color: var(--canvas-subtle);
      object-fit: cover;
    }

    .profile-sidebar__avatar--skeleton {
      background: linear-gradient(90deg, var(--canvas-subtle) 25%, #eaeef2 37%, var(--canvas-subtle) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }

    @keyframes shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }

    /* ---------- Profile status badge -------------------------------------- */

    .profile-sidebar__status {
      position: absolute;
      right: 8px;
      bottom: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: calc(100% - 16px);
      padding: 2px 8px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-pill);
      background-color: var(--canvas-overlay);
      box-shadow: var(--shadow-sm);
      font-size: 12px;
      line-height: 20px;
      color: var(--fg-default);
    }

    .profile-sidebar__status-emoji {
      font-size: 12px;
      line-height: 1;
    }

    .profile-sidebar__status-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ---------- Identity -------------------------------------------------- */

    .profile-sidebar__name {
      font-size: 24px;
      font-weight: 600;
      line-height: 30px;
      overflow-wrap: anywhere;
    }

    .profile-sidebar__handle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 20px;
      font-weight: 300;
      line-height: 24px;
      color: var(--fg-muted);
      word-break: break-all;
    }

    .profile-sidebar__verified {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: var(--accent-fg);
      color: #fff;
    }

    .profile-sidebar__verified app-icon {
      width: 12px;
      height: 12px;
    }

    /* ---------- Follow ---------------------------------------------------- */

    .profile-sidebar__follow {
      width: 100%;
      padding: 5px 16px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background-color: var(--canvas-default);
      color: var(--fg-default);
      font-size: 14px;
      font-weight: 500;
      line-height: 21px;
      cursor: pointer;
      transition: background-color 0.12s ease;
    }

    .profile-sidebar__follow:hover {
      background-color: var(--canvas-subtle);
    }

    .profile-sidebar__follow--active {
      background-color: var(--success-fg);
      border-color: rgba(27, 31, 36, 0.15);
      color: #ffffff;
    }

    .profile-sidebar__follow--active:hover {
      background-color: var(--success-emphasis);
    }

    /* ---------- Bio ------------------------------------------------------- */

    .profile-sidebar__bio {
      font-size: 16px;
      line-height: 24px;
      white-space: pre-line;
      color: var(--fg-default);
    }

    /* ---------- Followers / following -------------------------------------- */

    .profile-sidebar__followers {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      line-height: 20px;
      color: var(--fg-muted);
    }

    .profile-sidebar__followers a {
      color: var(--fg-muted);
    }

    .profile-sidebar__followers a:hover {
      color: var(--accent-fg);
      text-decoration: none;
    }

    /* ---------- Organisations --------------------------------------------- */

    .profile-sidebar__orgs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .profile-sidebar__org {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px 2px 2px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-pill);
      color: var(--fg-default);
      font-size: 12px;
      font-weight: 600;
    }

    .profile-sidebar__org:hover {
      text-decoration: none;
      background-color: var(--canvas-subtle);
    }

    .profile-sidebar__org img {
      border-radius: 50%;
    }

    /* ---------- Meta list -------------------------------------------------- */

    .profile-sidebar__meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      font-size: 14px;
      line-height: 21px;
    }

    .profile-sidebar__meta li {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--fg-muted);
      word-break: break-word;
    }

    .profile-sidebar__meta app-icon {
      color: var(--fg-muted);
    }

    .profile-sidebar__meta a {
      color: var(--accent-fg);
      overflow-wrap: anywhere;
    }

    /* ---------- Achievements ------------------------------------------------ */

    .profile-sidebar__achievements {
      width: 100%;
    }

    .profile-sidebar__achievements-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .profile-sidebar__achievements-head h2 {
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
    }

    .profile-sidebar__link-btn {
      border: 0;
      background: none;
      padding: 0;
      color: var(--fg-muted);
      font-size: 12px;
      cursor: pointer;
    }

    .profile-sidebar__link-btn:hover {
      color: var(--accent-fg);
      text-decoration: underline;
    }

    .profile-sidebar__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .profile-sidebar__badge img {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-sm);
      transition: transform 0.12s ease;
    }

    .profile-sidebar__badge:hover img {
      transform: scale(1.06);
    }

    /* ---------- Report ------------------------------------------------------ */

    .profile-sidebar__report {
      border: 0;
      background: none;
      padding: 0;
      font-size: 14px;
      font-weight: 500;
      line-height: 21px;
      color: var(--fg-muted);
      cursor: pointer;
    }

    .profile-sidebar__report:hover {
      color: var(--accent-fg);
      text-decoration: underline;
    }

    /* ---------- Footer -------------------------------------------------------- */

    .profile-footer {
      border-top: 1px solid var(--border-default);
      padding-top: 16px;
    }

    .profile-footer ul {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      font-size: 12px;
      color: var(--fg-subtle);
    }

    .profile-footer a {
      color: var(--fg-subtle);
    }

    .profile-footer a:hover {
      color: var(--accent-fg);
    }

    @media (max-width: 767px) {
      .profile-sidebar__avatar-wrap {
        max-width: 96px;
      }

      .profile-sidebar__name {
        font-size: 20px;
        line-height: 26px;
      }

      .profile-sidebar__handle {
        font-size: 16px;
        line-height: 22px;
      }

      .profile-sidebar__bio {
        font-size: 14px;
        line-height: 21px;
      }

      .profile-sidebar__follow {
        width: auto;
      }
    }
  `,
})
export class ProfileSidebar {
  readonly user = input<GithubUser | null>(null);
  readonly orgs = input<GithubOrg[]>([]);
  readonly achievements = input<Achievement[]>([]);
  readonly status = input<string>(PROFILE_FALLBACKS.status);
  readonly linkedinHandle = input<string>('');

  protected readonly footerLinks = FOOTER_LINKS;
  protected readonly showAllAchievements = signal(false);
  protected readonly following = signal(false);

  protected readonly visibleAchievements = computed(() =>
    this.showAllAchievements() ? this.achievements() : this.achievements().slice(0, 4),
  );

  protected readonly isVerified = computed(() => this.user()?.type === 'Organization');

  /** The status is stored as `"<emoji> <label>"` — e.g. `"🎯 Focusing"`. */
  protected readonly statusEmoji = computed(() => this.status().trim().split(/\s+/)[0] ?? '');

  protected readonly statusText = computed(() =>
    this.status().trim().split(/\s+/).slice(1).join(' ') || this.status().trim(),
  );

  protected readonly displayBlog = computed(() => {
    const blog = this.user()?.blog;
    if (!blog) return '';
    return blog.replace(/^https?:\/\//, '').replace(/\/$/, '');
  });

  protected readonly blogUrl = computed(() => {
    const blog = this.user()?.blog;
    if (!blog) return '';
    return /^https?:\/\//.test(blog) ? blog : `https://${blog}`;
  });

  protected toggleFollow(): void {
    this.following.update((value) => !value);
  }

  protected onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src =
      'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
  }
}
