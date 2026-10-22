<<<<<<< HEAD
# uptime
=======
# UptimeAI — GitHub Profile Explorer

An Angular application that renders the GitHub profile page of
[`shreeramk`](https://github.com/shreeramk) — responsive, close to the real
github.com layout, and driven by **live GitHub APIs** wherever GitHub exposes
the data.

![UptimeAI](https://img.shields.io/badge/Angular-22.2-red?logo=angular) ![ECharts](https://img.shields.io/badge/chart-Apache%20ECharts-6.1-blue)

---

## Quick start

```bash
npm install
npm start          # API server (:4310) + Angular dev server (:4200)
```

Open <http://localhost:4200/>.

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm start`         | Runs the Node API/proxy **and** the Angular dev server      |
| `npm run start:web` | Angular dev server only (expects the API on `:4310`)        |
| `npm run start:api` | Node API/proxy only (also serves `dist/` when it exists)     |
| `npm run build`     | Production build into `dist/uptime`                         |
| `npm run serve:prod`| Builds and serves the production bundle on `:4310`           |
| `npm test`          | Unit tests (Vitest)                                         |

The dev server proxies every `/api` request to the Node server
(`proxy.conf.json`), so the browser only ever talks to one origin.

### Vercel deployment

The repository includes a Vercel function at
`api/contributions/[username].mjs`. Use the repository root as the Vercel
project root. The checked-in `vercel.json` configures:

```text
Build command: npm run build
Output directory: dist/uptime/browser
```

Add this Production environment variable in Vercel:

```text
GITHUB_TOKEN=<a GitHub token with access to contribution data>
```

The token is read only by the serverless function and is never sent to the
Angular bundle or returned in an API response. If it is omitted, the function
tries GitHub's public contributions page without authentication.

---

## Where the data comes from

| Part of the UI                | Source                                                                   | Live? |
| ----------------------------- | ------------------------------------------------------------------------ | ----- |
| Left panel (name, bio, …)    | `GET https://api.github.com/users/shreeramk`                              | ✅    |
| Organisation badge            | `GET https://api.github.com/users/shreeramk/orgs`                         | ✅    |
| Repositories tab              | `GET https://api.github.com/users/shreeramk/repos`                         | ✅    |
| Stars tab                     | `GET https://api.github.com/users/shreeramk/starred`                       | ✅    |
| Contribution heat map         | `contributionsCollection` (GraphQL) **or** `github.com/users/:u/contributions` | ✅ |
| "Popular repositories" grid   | GitHub exposes no REST endpoint for pins → static data                     | ➖    |
| Achievements / LinkedIn       | GraphQL-only or not public at all → static data                           | ➖    |

Everything that GitHub does not expose is mock data and is clearly marked as
such in `src/app/core/data/mock-data.ts`.

### REST calls

`api.github.com` sends `Access-Control-Allow-Origin: *`, so the calls work
straight from the browser. They are nevertheless routed through the bundled
proxy (`/api/github/*`) because it

* **caches** every upstream response (15 min), which keeps the app well below
  the 60 requests/hour budget of the anonymous GitHub API, and
* **forwards the personal access token** when one is configured.

If the proxy is not running the app transparently falls back to a direct call
to `api.github.com`.

### Contribution heat map

GitHub has no public REST endpoint for the contribution calendar. The app uses
two live sources, in order:

1. **Official GraphQL API** — the Vercel function calls
   `POST https://api.github.com/graphql` with the server-side `GITHUB_TOKEN`.
2. **Public contributions page** — `https://github.com/users/:user/contributions`.
   That response carries **no CORS headers**, so the browser cannot read it.
   The bundled Node server (`server/server.mjs`) fetches it, parses the
   `<td data-date data-level>` cells plus the day tool-tips, and returns
   clean JSON on `/api/contributions/:user`.

If the server endpoint fails, the app falls back to deterministic mock data so
the UI is never empty and displays the fallback notification. A server failure
is never reported as live data.

The chart itself is drawn with **Apache ECharts** (`echarts/core` +
`CalendarComponent` + `HeatmapChart` + `VisualMapComponent`, tree-shaken) using
GitHub's exact green scale:

```
#ebedf0  #9be9a8  #40c463  #30a14e  #216e39
level 0  level 1  level 2  level 3  level 4
```

Contribution levels are derived the way GitHub derives them: days with at least
one contribution are bucketed into quartiles, days without one are level 0
(see `assignLevels()` in `src/app/core/services/contribution.service.ts`).

---

## The bundled server (`server/server.mjs`)

A dependency-free Node server (`node:http`, no Express) that does two jobs:

| Route                    | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `GET /api/health`        | Liveness probe                                                   |
| `GET /api/contributions/:user?from=&to=` | Parses GitHub's contributions page into `{ from, to, days[], total, levelCounts }` |
| `GET /api/github/*`      | Cached, token-aware proxy for `api.github.com`                   |
| `GET /*`                 | Serves `dist/uptime/browser` with SPA fallback                  |

`from`/`to` are optional: GitHub snaps those parameters to whole calendar
years, so the default (no parameters) is used for the rolling "last 12 months"
calendar and a full year is requested when the user picks one in the dropdown.

---

## Project layout

```
src/app/
├── core/
│   ├── data/mock-data.ts               # static data for the few bits GitHub has no API for
│   ├── models/github.models.ts         # response models + language colours
│   └── services/
│       ├── github-api.service.ts       # REST wrapper (proxy first, direct fallback) + GraphQL
│       ├── contribution.service.ts     # server endpoint → mock fallback, quartile levels
│       └── toast.service.ts            # transient notifications
├── features/
│   ├── profile-page/                   # orchestrator: tabs, year switch, token dialog
│   ├── profile-sidebar/                # live left-hand profile panel
│   ├── profile-tabs/                   # Overview / Repositories / Projects / Packages / Stars
│   ├── contribution-graph/             # ECharts calendar heat map
│   ├── activity-overview/              # contribution statistics
│   ├── pinned-repos/ repo-list/ empty-state/
└── shared/                             # inline SVG icon set + GitHub-style top nav
server/server.mjs                       # contributions proxy + REST proxy + static server
```

---

## Accessibility & responsiveness

* Semantic landmarks (`aside`, `main`, `nav`), `role="tablist"`/`role="tab"`,
  `aria-selected` and `aria-modal` on the token dialog.
* The layout collapses from a two-column desktop layout to a single column
  below 1012 px and adapts the sidebar below 768 px.
* The heat map is a canvas, so it is exposed to assistive technology through
  the summary statistics rendered next to it.
* Visible focus rings, a skip-free tab order and `prefers-reduced-motion`
  friendly animations.

---

## Rate limits

Anonymous calls to `api.github.com` are limited to **60 requests per hour per
IP**. The proxy cache keeps the app comfortably below that. To lift the limit,
open the contribution data source dialog and paste a personal access token
(`read:user` is enough for the calendar; `public_repo` is enough for the
REST calls). Authenticated requests get 5,000 requests/hour.

---

## Reference

* REST API — <https://docs.github.com/en/rest>
* Get a user — <https://docs.github.com/en/rest/users/users#get-a-user>
* GraphQL API — <https://docs.github.com/en/graphql>
>>>>>>> 97f3a39 (Remove hardcoded shreeramk references)
