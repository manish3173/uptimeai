import { Injectable, signal } from '@angular/core';

/** Storage key for the optional GitHub personal access token. */
const TOKEN_STORAGE_KEY = 'uptimeai.githubToken';

/**
 * Optional GitHub personal access token.
 *
 * The token is never required: without it the app falls back to the public
 * endpoints (which are rate limited to 60 requests/hour per IP). With a token
 * the app talks to the official GraphQL API for the contribution calendar and
 * gets a 5,000 requests/hour budget for the REST calls.
 *
 * The value is kept in `localStorage` so a reload does not ask for it again.
 */
@Injectable({ providedIn: 'root' })
export class GithubTokenService {
  readonly token = signal<string | null>(readStoredToken());

  /** The token, or `null` when the app runs unauthenticated. */
  get(): string | null {
    return this.token();
  }

  /** Store (or clear) the token. */
  set(value: string | null): void {
    const trimmed = value?.trim() || null;
    try {
      if (trimmed) {
        localStorage.setItem(TOKEN_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      /* storage unavailable (private mode) — keep the in-memory value only */
    }
    this.token.set(trimmed);
  }

  /** Remove the stored token. */
  clear(): void {
    this.set(null);
  }
}

/** Read the token without throwing when storage is unavailable. */
function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
