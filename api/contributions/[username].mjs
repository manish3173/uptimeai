import { parseContributions } from '../../server/contribution-parser.mjs';

const USER_AGENT = 'UptimeAI-GitHub-Profile/1.0';
const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(status).json(body);
}

function dateRange(query) {
  const year = Number(query.year);
  if (Number.isInteger(year) && year >= 2008 && year <= 2100) {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }

  const from = typeof query.from === 'string' ? query.from : '';
  const to = typeof query.to === 'string' ? query.to : '';
  return { from, to };
}

async function fetchGraphql(username, from, to) {
  const today = new Date();
  const start =
    from ||
    new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = to || today.toISOString().slice(0, 10);
  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      query: `
        query Contributions($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays { date contributionCount }
                }
              }
            }
          }
        }
      `,
      variables: {
        login: username,
        from: `${start}T00:00:00Z`,
        to: `${end}T23:59:59Z`,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(`GitHub GraphQL request failed with ${response.status}.`);
  }

  const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error('GitHub returned no contribution calendar.');

  const days = calendar.weeks.flatMap((week) =>
    week.contributionDays.map((day) => ({ date: day.date, count: day.contributionCount, level: 0 })),
  );
  return {
    username,
    from: days[0]?.date ?? start,
    to: days.at(-1)?.date ?? end,
    days,
    total: calendar.totalContributions,
    levelCounts: [0, 0, 0, 0, 0],
    source: 'graphql',
  };
}

async function fetchPublicCalendar(username, from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.size ? `?${params}` : '';
  const response = await fetch(
    `https://github.com/users/${encodeURIComponent(username)}/contributions${query}`,
    { headers: { Accept: 'text/html', 'User-Agent': USER_AGENT } },
  );
  if (!response.ok) throw new Error(`GitHub contributions page returned ${response.status}.`);

  const result = parseContributions(await response.text(), username);
  if (result.days.length === 0) throw new Error('No contribution cells found.');
  return { ...result, source: 'rest-proxy' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  const username = req.query.username;
  if (typeof username !== 'string' || !/^[A-Za-z0-9-]+$/.test(username)) {
    return json(res, 400, { error: 'A valid GitHub username is required.' });
  }

  const { from, to } = dateRange(req.query);
  try {
    const result = process.env.GITHUB_TOKEN
      ? await fetchGraphql(username, from, to)
      : await fetchPublicCalendar(username, from, to);
    return json(res, 200, result);
  } catch (error) {
    console.error('Contribution API failed:', error instanceof Error ? error.message : error);
    return json(res, 502, {
      error: 'Unable to load live GitHub contributions.',
      configured: Boolean(process.env.GITHUB_TOKEN),
    });
  }
}
