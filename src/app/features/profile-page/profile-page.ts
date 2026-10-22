import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import {
  Achievement,
  ContributionResult,
  GithubEvent,
  GithubOrg,
  GithubRepo,
  GithubUser,
} from '../../core/models/github.models';
import { GithubApiService } from '../../core/services/github-api.service';
import { ContributionService } from '../../core/services/contribution.service';
import { ToastService } from '../../core/services/toast.service';
import { MOCK_ACHIEVEMENTS, MOCK_PINNED_REPOS } from '../../core/data/mock-data';
import { Icon } from '../../shared/icon';
import { ProfileSidebar } from '../profile-sidebar/profile-sidebar';
import { ProfileTabs, ProfileTab, ProfileTabId } from '../profile-tabs/profile-tabs';
import { ContributionGraph } from '../contribution-graph/contribution-graph';
import { PinnedRepos } from '../pinned-repos/pinned-repos';
import { RepoList } from '../repo-list/repo-list';
import { EmptyState } from '../empty-state/empty-state';
import { ActivityOverview } from '../activity-overview/activity-overview';

/** Default profile rendered by the app. */
const DEFAULT_USERNAME = 'shreeramk';

/**
 * Root page of the profile experience.
 *
 * Data sources
 * ------------
 * - `GET /users/{username}`                → left panel
 * - `GET /users/{username}/orgs`           → organisation badge
 * - `GET /users/{username}/repos`          → Repositories tab
 * - `GET /users/{username}/starred`        → Stars tab
 * - GitHub contributions API / GraphQL     → heat map (see `ContributionService`)
 */
@Component({
  selector: 'app-profile-page',
  imports: [
    FormsModule,
    Icon,
    ProfileSidebar,
    ProfileTabs,
    ContributionGraph,
    PinnedRepos,
    RepoList,
    EmptyState,
    ActivityOverview,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {
  private readonly api = inject(GithubApiService);
  private readonly contributions = inject(ContributionService);
  private readonly toast = inject(ToastService);

  readonly username = signal(DEFAULT_USERNAME);

  readonly user = signal<GithubUser | null>(null);
  readonly orgs = signal<GithubOrg[]>([]);
  readonly repos = signal<GithubRepo[]>([]);
  readonly starred = signal<GithubRepo[]>([]);
  readonly achievements = signal<Achievement[]>(MOCK_ACHIEVEMENTS);

  readonly activeTab = signal<ProfileTabId>('overview');
  readonly loading = signal(true);
  readonly reposLoading = signal(true);
  readonly starredLoading = signal(true);

  readonly contribution = signal<ContributionResult | null>(null);
  readonly contributionLoading = signal(true);
  readonly selectedYear = signal<number | null>(null);

  /** Public event stream — powers the "Activity overview" panel. */
  readonly events = signal<GithubEvent[]>([]);

  /** Dialog for the optional GitHub personal access token. */
  readonly tokenDialogOpen = signal(false);
  readonly tokenInput = signal('');

  /** Banner shown when the GitHub REST API could not be reached. */
  readonly apiNotice = signal<string | null>(null);

  /** LinkedIn is not part of the public REST API → mock data. */
  protected readonly linkedinHandle = 'shreeramkushwaha';

  /** Pinned repositories are not exposed by the REST API → mock data. */
  protected readonly mockPinned = MOCK_PINNED_REPOS;

  protected readonly tabs = computed<ProfileTab[]>(() => [
    { id: 'overview', label: 'Overview', icon: 'repo' },
    { id: 'repositories', label: 'Repositories', icon: 'repo', count: this.user()?.public_repos ?? 0 },
    { id: 'projects', label: 'Projects', icon: 'project' },
    { id: 'packages', label: 'Packages', icon: 'package' },
    { id: 'stars', label: 'Stars', icon: 'star' },
  ]);

  /** Years that can be selected in the contribution card. */
  protected readonly years = computed(() => {
    const created = this.user()?.created_at;
    const startYear = created ? new Date(created).getUTCFullYear() : new Date().getUTCFullYear() - 5;
    const currentYear = new Date().getUTCFullYear();
    const years: number[] = [];
    for (let year = currentYear; year >= startYear; year -= 1) years.push(year);
    return years;
  });

  protected readonly totalStars = computed(() =>
    this.repos().reduce((sum, repo) => sum + repo.stargazers_count, 0),
  );

  ngOnInit(): void {
    this.tokenInput.set(this.contributions.getToken() ?? '');
    this.loadProfile();
    this.loadContributions();
    this.loadEvents();
  }

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  private loadProfile(): void {
    this.loading.set(true);

    if (!this.username().trim()) {
      this.loading.set(false);
      this.apiNotice.set('No GitHub username was given — add one to load the profile.');
      return;
    }

    this.api
      .getUser(this.username())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.apiNotice.set(null);
          this.years();
          this.loadRepos();
          this.loadStarred();
        },
        error: (error: unknown) => {
          this.apiNotice.set(describeApiError(error));
          this.toast.show('Could not load the profile from the GitHub API.', 'danger');
          this.loadRepos();
          this.loadStarred();
        },
      });

    this.api.getOrgs(this.username()).subscribe({
      next: (orgs) => this.orgs.set(orgs),
      error: () => this.orgs.set([]),
    });
  }

  private loadRepos(): void {
    this.reposLoading.set(true);
    if (!this.username().trim()) {
      this.reposLoading.set(false);
      return;
    }
    this.api
      .getRepos(this.username())
      .pipe(finalize(() => this.reposLoading.set(false)))
      .subscribe({
        next: (repos) => this.repos.set(repos),
        error: () => this.toast.show('Could not load repositories.', 'danger'),
      });
  }

  private loadStarred(): void {
    this.starredLoading.set(true);
    if (!this.username().trim()) {
      this.starredLoading.set(false);
      return;
    }
    this.api
      .getStarred(this.username())
      .pipe(finalize(() => this.starredLoading.set(false)))
      .subscribe({
        next: (repos) => this.starred.set(repos),
        error: () => this.starred.set([]),
      });
  }

  /** Load the contribution calendar for the last 12 months or a given year. */
  protected loadContributions(): void {
    this.contributionLoading.set(true);

    if (!this.username().trim()) {
      this.contributionLoading.set(false);
      return;
    }

    const year = this.selectedYear();
    // Without an explicit year GitHub returns its rolling "last 12 months"
    // calendar; a specific year is requested as a full calendar year.
    const from = year ? `${year}-01-01` : null;
    const to = year ? `${year}-12-31` : null;

    this.contributions
      .load(this.username(), from, to)
      .pipe(finalize(() => this.contributionLoading.set(false)))
      .subscribe((result) => {
        this.contribution.set(result);
        if (result.source === 'mock') {
          this.toast.show(
            'Live contribution data is unavailable — showing mock contributions.',
            'danger',
          );
        }
      });
  }

  /**
   * Load the public event stream. It backs the "Activity overview" panel,
   * which breaks the activity down into code review, issues, pull requests
   * and commits.
   */
  protected loadEvents(): void {
    if (!this.username().trim()) {
      return;
    }

    this.api.getPublicEvents(this.username()).subscribe({
      next: (events) => this.events.set(events),
      error: () => this.events.set([]),
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */

  protected selectTab(tab: ProfileTabId): void {
    this.activeTab.set(tab);
  }

  /** `0` means "the rolling last 12 months" instead of a calendar year. */
  protected onYearChange(year: number): void {
    this.selectedYear.set(year > 0 ? year : null);
    this.loadContributions();
  }

  protected refreshContributions(): void {
    this.loadContributions();
  }

  protected openTokenDialog(): void {
    this.tokenInput.set(this.contributions.getToken() ?? '');
    this.tokenDialogOpen.set(true);
  }

  protected closeTokenDialog(): void {
    this.tokenDialogOpen.set(false);
  }

  protected saveToken(): void {
    this.contributions.setToken(this.tokenInput());
    this.tokenDialogOpen.set(false);
    this.toast.show(
      this.tokenInput()
        ? 'Token saved — reloading live data from the GitHub API.'
        : 'Token cleared — falling back to the public contributions API.',
      'success',
    );
    // The token lifts the REST rate limit as well, so reload everything.
    this.loadProfile();
    this.loadContributions();
    this.loadEvents();
  }
}

/** Turn a failed REST call into a message the user can act on. */
function describeApiError(error: unknown): string | null {
  const status = (error as HttpErrorResponse)?.status;

  if (status === 403 || status === 429) {
    return 'The GitHub REST API rate limit was reached (60 requests/hour for anonymous requests). Add a personal access token to load live profile data.';
  }

  if (status === 401) {
    return 'The GitHub personal access token was rejected. Clear or replace it in the contribution data source dialog.';
  }

  if (status === 0) {
    return 'The GitHub API could not be reached. Check your network connection.';
  }

  return null;
}
