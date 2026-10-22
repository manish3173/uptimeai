import { Injectable, computed, signal } from '@angular/core';

import { GithubUser } from '../models/github.models';

/** Default profile rendered by the app. */
export const DEFAULT_USERNAME = 'shreeramk';

const GITHUB_MARK =
  'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';

/**
 * Shared identity for the global header and the profile page.
 *
 * The profile page writes the live `GET /users/{username}` payload here so
 * the top-nav avatar can show the same photo without lifting state through
 * the router outlet.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  readonly username = signal(DEFAULT_USERNAME);
  readonly user = signal<GithubUser | null>(null);

  readonly avatarUrl = computed(() => {
    const fromApi = this.user()?.avatar_url?.trim();
    if (fromApi) return fromApi;

    const login = this.username().trim() || this.user()?.login?.trim() || '';
    if (login) return `https://github.com/${encodeURIComponent(login)}.png?size=40`;

    return GITHUB_MARK;
  });
}
