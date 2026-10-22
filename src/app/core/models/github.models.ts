/**
 * Domain models for the GitHub profile experience.
 *
 * These types describe the shapes returned by the GitHub REST API
 * (https://docs.github.com/en/rest) and the GitHub GraphQL API, plus the
 * normalised contribution-calendar model used by the heat map.
 */

/** `GET /users/{username}` — https://docs.github.com/en/rest/users/users#get-a-user */
export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
  site_admin: boolean;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

/** `GET /users/{username}/repos` */
export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  private: boolean;
  language: string | null;
  languages_url: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  license: { key: string; name: string; spdx_id: string | null } | null;
  owner: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  homepage: string | null;
}

/** `GET /users/{username}/orgs` */
export interface GithubOrg {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  description: string | null;
}

/** `GET /users/{username}/events/public` */
export interface GithubEvent {
  id: string;
  type: string;
  repo: { id: number; name: string; url: string };
  payload: {
    commits?: { message: string; sha: string; url: string }[];
    action?: string;
    ref?: string;
    ref_type?: string;
    pull_request?: { title?: string; html_url?: string };
    issue?: { title?: string; html_url?: string };
  };
  actor: { login: string; avatar_url: string; display_login: string };
  created_at: string;
}

/** A single day of the contribution calendar. */
export interface ContributionDay {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  /** Number of contributions on that day. */
  count: number;
  /** GitHub contribution level, 0 (none) → 4 (most). */
  level: number;
}

/** Aggregated contribution data for a year / range. */
export interface ContributionCalendar {
  username: string;
  /** Inclusive ISO start date. */
  from: string;
  /** Inclusive ISO end date. */
  to: string;
  days: ContributionDay[];
  /** Sum of `count` across all days. */
  total: number;
  /** Per-level day counts, index 0 → 4. */
  levelCounts: number[];
}

/** Where the contribution data came from — surfaced in the UI. */
export type ContributionSource =
  | 'graphql' // Official GitHub GraphQL API (requires a token)
  | 'rest-proxy' // GitHub public contributions calendar, normalised by our proxy
  | 'mock'; // Static mock data (fallback / offline)

export interface ContributionResult {
  calendar: ContributionCalendar;
  source: ContributionSource;
  /** Human readable label shown in the UI. */
  label: string;
}

/** GraphQL `contributionsCollection` node. */
export interface ContributionsCollection {
  totalContributions: number;
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
}

/** Badge shown in the profile sidebar. */
export interface Achievement {
  /** Achievement slug, e.g. `yolo-default`. */
  id: string;
  title: string;
  /** Octicon/asset url for the badge artwork. */
  imageUrl: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

/** Entry of the "Popular repositories" grid. */
export interface PinnedRepo {
  name: string;
  description: string;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  /** Present when the repo is a fork. */
  forkedFrom: string | null;
  isPublic: boolean;
}

/** Language → hex colour, mirroring GitHub's linguist palette. */
export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  'C#': '#178600',
  C: '#555555',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Dart: '#00B4AB',
  Vue: '#41b883',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Shell: '#89e051',
  Docker: '#384d54',
  Scala: '#c22d40',
  Haskell: '#5e5086',
  Lua: '#000080',
  Clojure: '#db5855',
  Elixir: '#6e4a7e',
  Erlang: '#B83998',
  Julia: '#a270ba',
  Objective: '#438eff',
  'Jupyter Notebook': '#DA5B0B',
  Makefile: '#427819',
  CMake: '#DA3434',
  Groovy: '#4298b8',
  PowerShell: '#012456',
  'Vim Script': '#199f4b',
  TeX: '#3D6117',
  R: '#198CE7',
  Nim: '#ffc200',
  OCaml: '#3be133',
  Zig: '#ec915c',
};

export function languageColor(language: string | null | undefined): string | null {
  if (!language) return null;
  return LANGUAGE_COLORS[language] ?? '#8b949e';
}
