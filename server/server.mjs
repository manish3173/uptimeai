#!/usr/bin/env node
/**
 * UptimeAI — lightweight API + static server.
 *
 * Why this exists
 * ---------------
 * GitHub exposes the contribution calendar as an HTML page
 * (`https://github.com/users/:user/contributions`) but that response does not
 * include CORS headers, so a browser cannot read it directly. This server
 * fetches it server-side, parses the `<td data-date data-level>` cells and
 * the day tool-tips, and returns clean JSON that the Angular app can graph.
 *
 * The same server also fronts the GitHub REST API (`/api/github/*`). Every
 * upstream response is cached in memory, which keeps the app well below the
 * 60 requests/hour budget of the unauthenticated GitHub API and removes the
 * need for a second round trip from the browser.
 *
 * When a GitHub personal access token is available the Angular app talks to
 * the official GraphQL API (`contributionsCollection`) directly and forwards
 * the token to this proxy for the REST calls.
 *
 * Usage:
 *   node server/server.mjs                 # serve ./dist/uptime/browser
 *   PORT=4000 node server/server.mjs
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'uptime', 'browser');
const PORT = Number(process.env.PORT || 4310);

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';

/** In-memory cache: `key -> { expires, value }`. */
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** REST responses change slowly — cache them for longer. */
const REST_CACHE_TTL_MS = 15 * 60 * 1000;

/** Base URL of the GitHub REST API. */
const GITHUB_REST_API = 'https://api.github.com';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

/* -------------------------------------------------------------------------- */
/* Contribution calendar parsing                                              */
/* -------------------------------------------------------------------------- */

const CELL_RE =
  /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"[^>]*>\s*<\/td>\s*<tool-tip[^>]*>([^<]*)<\/tool-tip>/g;
const COUNT_RE = /(\d+)\s+contribution/i;
const FROM_RE = /data-from="(\d{4}-\d{2}-\d{2})/;
const TO_RE = /data-to="(\d{4}-\d{2}-\d{2})/;

/**
 * Parse GitHub's contributions calendar markup into a normalised day list.
 *
 * @param {string} html raw HTML of `https://github.com/users/:user/contributions`
 * @param {string} username
 * @returns {{ username: string, from: string, to: string, days: Array, total: number, levelCounts: number[] }}
 */
export function parseContributions(html, username) {
  const days = [];
  const levelCounts = [0, 0, 0, 0, 0];
  let total = 0;

  CELL_RE.lastIndex = 0;
  let match;
  while ((match = CELL_RE.exec(html)) !== null) {
    const [, date, levelRaw, tooltip] = match;
    const level = Number(levelRaw);
    const countMatch = COUNT_RE.exec(tooltip);
    const count = countMatch ? Number(countMatch[1]) : 0;

    days.push({ date, count, level });
    levelCounts[level] += 1;
    total += count;
  }

  const fromMatch = FROM_RE.exec(html);
  const toMatch = TO_RE.exec(html);
  const from = fromMatch ? fromMatch[1] : days[0]?.date ?? '';
  const to = toMatch ? toMatch[1] : days[days.length - 1]?.date ?? '';

  return { username, from, to, days, total, levelCounts };
}

/** Fetch and parse the contributions calendar for a user. */
async function fetchContributions(username, from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const url = `https://github.com/users/${encodeURIComponent(username)}/contributions${
    params.size ? `?${params.toString()}` : ''
  }`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });

  if (!response.ok) {
    throw new Error(`GitHub responded with ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const parsed = parseContributions(html, username);

  if (parsed.days.length === 0) {
    throw new Error('No contribution cells found — GitHub may have changed its markup.');
  }

  return parsed;
}

/* -------------------------------------------------------------------------- */
/* Pinned repository parsing                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Parse the "Popular repositories" grid of a GitHub profile page.
 *
 * GitHub exposes no REST endpoint for pins, but the rendered profile page
 * contains them, so the bundled server scrapes them the same way it scrapes
 * the contribution calendar.
 *
 * @param {string} html raw HTML of `https://github.com/:user`
 * @param {string} username
 * @returns {Array<{name: string, description: string, language: string|null,
 *                  languageColor: string|null, forkedFrom: string|null,
 *                  isPublic: boolean}>}
 */
export function parsePinned(html, username) {
  const marker = /pinned-item-list-item-content/g;
  const starts = [];
  let match;
  while ((match = marker.exec(html)) !== null) {
    starts.push(match.index);
  }

  const repos = [];

  for (let i = 0; i < starts.length; i += 1) {
    const block = html.slice(starts[i], starts[i + 1] ?? starts[i] + 6000);

    const name = /<span class="repo"[^>]*>\s*([^<]+?)\s*<\/span>/.exec(block)?.[1];
    if (!name) continue;

    const description =
      /pinned-item-desc[^>]*>\s*([\s\S]*?)\s*<\/p>/.exec(block)?.[1]?.replace(/\s+/g, ' ') ?? '';

    const language =
      /itemprop="programmingLanguage">([^<]+)</.exec(block)?.[1]?.trim() ?? null;

    const languageColor =
      /repo-language-color"[^>]*style="background-color:\s*([^";]+)/.exec(block)?.[1]?.trim() ?? null;

    const forkedFrom =
      /Forked from\s*<a[^>]*href="\/([^"?#]+)"[^>]*>([^<]+)<\/a>/.exec(block);

    const visibility = /Label--secondary[^>]*>\s*(Public|Private)\s*</.exec(block)?.[1];

    repos.push({
      name,
      description: description || '',
      language,
      languageColor,
      forkedFrom: forkedFrom ? forkedFrom[2].trim() : null,
      isPublic: visibility !== 'Private',
    });
  }

  return repos;
}

/** Fetch and parse the pinned repositories of a user. */
async function fetchPinned(username) {
  const url = `https://github.com/${encodeURIComponent(username)}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });

  if (!response.ok) {
    throw new Error(`GitHub responded with ${response.status} ${response.statusText}`);
  }

  const repos = parsePinned(await response.text(), username);

  if (repos.length === 0) {
    throw new Error('No pinned repositories found — GitHub may have changed its markup.');
  }

  return { username, repos };
}

/* -------------------------------------------------------------------------- */
/* GitHub REST proxy                                                          */
/* -------------------------------------------------------------------------- */

/** Short, stable hash so tokens can be used as a cache key without leaking. */
function hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Forward a REST call to `api.github.com` and cache the response.
 *
 * The upstream status code is passed through unchanged so the Angular app can
 * tell a rate limit (403) apart from a missing resource (404).
 */
async function proxyGithubRest(req, res, pathname, searchParams) {
  const upstreamPath = pathname.slice('/api/github'.length) || '/';
  const search = searchParams.toString();
  const target = `${GITHUB_REST_API}${upstreamPath}${search ? `?${search}` : ''}`;

  const authorization = req.headers['authorization'];
  const authKey = authorization ? `auth:${hashToken(String(authorization))}` : 'anon';
  const cacheKey = `rest:${authKey}:${target}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.writeHead(cached.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-UptimeAI-Cache': 'HIT',
    });
    res.end(cached.body);
    return;
  }

  const headers = {
    Accept: req.headers['accept'] || 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (authorization) headers.Authorization = String(authorization);

  try {
    const response = await fetch(target, { headers });
    const body = await response.text();

    if (response.ok) {
      cache.set(cacheKey, {
        expires: Date.now() + REST_CACHE_TTL_MS,
        status: response.status,
        body,
      });
    }

    res.writeHead(response.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-UptimeAI-Cache': 'MISS',
    });
    res.end(body);
  } catch (error) {
    sendJson(res, 502, {
      error: 'Failed to reach the GitHub REST API.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/* -------------------------------------------------------------------------- */
/* HTTP helpers                                                               */
/* -------------------------------------------------------------------------- */

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(payload);
}

/** Serve a file from the built Angular app, with SPA fallback to index.html. */
function serveStatic(req, res, pathname) {
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST, safePath);

  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    // SPA fallback
    filePath = path.join(DIST, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        'Angular build not found. Run `npm run build` first, or use `npm start` for the dev server.\n',
      );
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const isImmutable = /\.[0-9a-f]{8,}\./i.test(path.basename(filePath));

  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': isImmutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });

  fs.createReadStream(filePath).pipe(res);
}

/* -------------------------------------------------------------------------- */
/* Server                                                                     */
/* -------------------------------------------------------------------------- */

export const createServer = () =>
  http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const { pathname, searchParams } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-GitHub-Api-Version',
    });
    res.end();
    return;
  }

  // --- API ----------------------------------------------------------------
  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true, uptime: process.uptime() });
    return;
  }

  // --- GitHub REST proxy ----------------------------------------------------
  if (pathname === '/api/github' || pathname.startsWith('/api/github/')) {
    await proxyGithubRest(req, res, pathname, searchParams);
    return;
  }

  // --- Pinned repositories ----------------------------------------------------
  const pinnedMatch = /^\/api\/pinned\/([^/]+)$/.exec(pathname);
  if (pinnedMatch) {
    const username = decodeURIComponent(pinnedMatch[1]);
    const cacheKey = `pinned:${username}`;

    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      sendJson(res, 200, cached.value);
      return;
    }

    try {
      const value = await fetchPinned(username);
      cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value });
      sendJson(res, 200, value);
    } catch (error) {
      sendJson(res, 502, {
        error: 'Could not load the pinned repositories.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  const contributionsMatch = /^\/api\/contributions\/([^/]+)$/.exec(pathname);
  if (contributionsMatch) {
    const username = decodeURIComponent(contributionsMatch[1]);
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const cacheKey = `${username}:${from}:${to}`;

    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      sendJson(res, 200, { ...cached.value, cached: true });
      return;
    }

    try {
      const payload = await fetchContributions(username, from, to);
      cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: payload });
      sendJson(res, 200, { ...payload, cached: false });
    } catch (error) {
      sendJson(res, 502, {
        error: 'Failed to load the GitHub contribution calendar.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  // --- Static -------------------------------------------------------------
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end('Method Not Allowed');
    return;
  }

  serveStatic(req, res, pathname === '/' ? '/index.html' : pathname);
  });

/* Only start listening when the file is executed directly (not imported). */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  createServer().listen(PORT, () => {
    console.log(`\n  UptimeAI server ready`);
    console.log(`  ➜  Static app : http://localhost:${PORT}`);
    console.log(`  ➜  API        : http://localhost:${PORT}/api/contributions/:username`);
    console.log(`  ➜  REST proxy : http://localhost:${PORT}/api/github/*`);
    console.log(`  ➜  Serving    : ${DIST}\n`);
  });
}
