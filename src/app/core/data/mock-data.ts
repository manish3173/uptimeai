import { Achievement, PinnedRepo } from '../models/github.models';

/**
 * Static data that GitHub's public REST API does not expose.
 * Everything that *is* exposed by an API is fetched live at runtime —
 * see `GithubApiService` and `ContributionService`.
 */

/** Achievements are only exposed through the GraphQL API; these are fallbacks. */
export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'yolo-default',
    title: 'YOLO',
    imageUrl: '/achievements/yolo-default.png',
    tier: 'bronze',
  },
  {
    id: 'quickdraw-default',
    title: 'Quickdraw',
    imageUrl: '/achievements/quickdraw-default.png',
    tier: 'silver',
  },
  {
    id: 'pair-extraordinaire-default',
    title: 'Pair Extraordinaire',
    imageUrl: '/achievements/pair-extraordinaire-default.png',
    tier: 'bronze',
  },
  {
    id: 'pull-shark-default',
    title: 'Pull Shark',
    imageUrl: '/achievements/pull-shark-default.png',
    tier: 'gold',
  },
  {
    id: 'starstruck-default',
    title: 'Starstruck',
    imageUrl: '/achievements/starstruck-default.png',
    tier: 'bronze',
  },
];

/**
 * Pinned repositories. GitHub exposes no REST endpoint for pins, so this is
 * the one part of the "Popular repositories" grid that uses static data.
 */
export const MOCK_PINNED_REPOS: PinnedRepo[] = [
  {
    name: 'gitignore',
    description: 'A collection of useful .gitignore templates',
    language: null,
    languageColor: null,
    stars: 0,
    forks: 0,
    forkedFrom: 'github/gitignore',
    isPublic: true,
  },
  {
    name: 'node-opcua-logger',
    description: 'An OPCUA Client for logging data to InfluxDB! 🔌 🏭',
    language: 'JavaScript',
    languageColor: '#f1e05a',
    stars: 0,
    forks: 0,
    forkedFrom: 'coussej/node-opcua-logger',
    isPublic: true,
  },
  {
    name: 'kafkajs',
    description: 'A modern Apache Kafka client for node.js',
    language: 'JavaScript',
    languageColor: '#f1e05a',
    stars: 0,
    forks: 0,
    forkedFrom: 'tulios/kafkajs',
    isPublic: true,
  },
  {
    name: 'node-opcua-1',
    description:
      'an implementation of a OPC UA stack fully written in javascript and nodejs - http://node-opcua.github.io/',
    language: 'TypeScript',
    languageColor: '#3178c6',
    stars: 0,
    forks: 0,
    forkedFrom: 'node-opcua/node-opcua-1',
    isPublic: true,
  },
  {
    name: 'Catch2',
    description:
      'A modern, C++-native, header-only, test framework for unit-tests, TDD and BDD - using C++11, C++14, C++17 and later (or C++03 on the Catch1.x branch)',
    language: 'C++',
    languageColor: '#f34b7d',
    stars: 0,
    forks: 0,
    forkedFrom: 'catchorg/Catch2',
    isPublic: true,
  },
  {
    name: 'TitaniumAS.Opc.Client',
    description: 'Open source .NET client library for OPC DA',
    language: 'C#',
    languageColor: '#178600',
    stars: 0,
    forks: 0,
    forkedFrom: 'TitaniumAS/Opc.Client',
    isPublic: true,
  },
];

/** Profile details that are rendered from the live API but may be absent. */
export const PROFILE_FALLBACKS = {
  pronouns: 'he/him',
  status: 'Available for work',
  sponsorUrl: '',
} as const;

/** Footer links shown under the profile sidebar (mirrors github.com). */
export const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: '© 2026 UptimeAI', href: 'https://github.com/UptimeAI' },
  { label: 'Footer', href: 'https://github.com/footer' },
  { label: 'Privacy', href: 'https://docs.github.com/site-policy/privacy-policies' },
  { label: 'Terms', href: 'https://docs.github.com/site-policy/terms-of-service' },
  { label: 'Cookies', href: 'https://github.com/settings/cookies' },
  { label: 'Manage cookies', href: 'https://github.com/settings/cookies' },
  { label: 'Accessibility feedback', href: 'https://github.com/accessibility' },
];
