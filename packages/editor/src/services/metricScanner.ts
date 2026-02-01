import type { RepoConfig } from '@dardocs/core';
import { searchCode, getFileContent } from './githubApi';

export interface DiscoveredMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'unknown';
  labels: string[];
  description: string;
  file: string;
  repo: string;
}

// Patterns for metric registration across languages
const METRIC_PATTERNS: {
  pattern: RegExp;
  type: DiscoveredMetric['type'];
  nameGroup: number;
  descGroup?: number;
  labelsGroup?: number;
}[] = [
  // Go: promauto / prometheus
  { pattern: /promauto\.New(Counter|Gauge|Histogram|Summary)(?:Vec)?\(\s*prometheus\.\1Opts\{\s*Name:\s*"([^"]+)"(?:.*?Help:\s*"([^"]+)")?/gs, type: 'counter', nameGroup: 2, descGroup: 3 },
  { pattern: /prometheus\.New(Counter|Gauge|Histogram|Summary)(?:Vec)?\(\s*prometheus\.\1Opts\{\s*Name:\s*"([^"]+)"(?:.*?Help:\s*"([^"]+)")?/gs, type: 'counter', nameGroup: 2, descGroup: 3 },

  // Python: prometheus_client
  { pattern: /(Counter|Gauge|Histogram|Summary)\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?(?:\s*,\s*\[([^\]]*)\])?/g, type: 'counter', nameGroup: 2, descGroup: 3, labelsGroup: 4 },

  // Node.js: prom-client
  { pattern: /new\s+(?:client\.)?(Counter|Gauge|Histogram|Summary)\(\s*\{\s*name:\s*['"]([^'"]+)['"](?:.*?help:\s*['"]([^'"]+)['"])?(?:.*?labelNames:\s*\[([^\]]*)\])?/gs, type: 'counter', nameGroup: 2, descGroup: 3, labelsGroup: 4 },

  // StatsD-style (generic)
  { pattern: /statsd\.(?:increment|gauge|histogram|timing)\(\s*['"]([^'"]+)['"]/g, type: 'unknown', nameGroup: 1 },

  // OpenTelemetry
  { pattern: /meter\.create(Counter|Histogram|UpDownCounter|ObservableGauge)\(\s*['"]([^'"]+)['"](?:\s*,\s*\{\s*description:\s*['"]([^'"]+)['"])?/g, type: 'counter', nameGroup: 2, descGroup: 3 },
];

function inferType(match: RegExpMatchArray, _defaultType: DiscoveredMetric['type']): DiscoveredMetric['type'] {
  const typeStr = (match[1] || '').toLowerCase();
  if (typeStr.includes('counter')) return 'counter';
  if (typeStr.includes('gauge') || typeStr.includes('updown')) return 'gauge';
  if (typeStr.includes('histogram') || typeStr.includes('timing')) return 'histogram';
  if (typeStr.includes('summary')) return 'summary';
  return 'unknown';
}

function parseLabels(labelsStr?: string): string[] {
  if (!labelsStr) return [];
  return labelsStr
    .split(',')
    .map((l) => l.trim().replace(/['"]/g, ''))
    .filter(Boolean);
}

function extractMetricsFromContent(
  content: string,
  filePath: string,
  repoName: string,
): DiscoveredMetric[] {
  const metrics: DiscoveredMetric[] = [];
  const seen = new Set<string>();

  for (const { pattern, type, nameGroup, descGroup, labelsGroup } of METRIC_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const name = match[nameGroup];
      if (!name || seen.has(name)) continue;
      seen.add(name);

      metrics.push({
        name,
        type: inferType(match, type),
        labels: parseLabels(labelsGroup !== undefined ? match[labelsGroup] : undefined),
        description: (descGroup !== undefined ? match[descGroup] : undefined) || '',
        file: filePath,
        repo: repoName,
      });
    }
  }

  return metrics;
}

// Search terms to find metric-related files
const SEARCH_QUERIES = [
  'promauto.New',
  'prometheus.New',
  'new Counter',
  'new Histogram',
  'new Gauge',
  'statsd.increment',
  'statsd.gauge',
  'meter.create',
  'prometheus_client',
  'prom-client',
];

/**
 * Discover metrics across all configured repos.
 * Uses GitHub code search to find candidate files, then fetches and parses them.
 */
export async function discoverMetrics(
  repos: RepoConfig[],
  onProgress?: (msg: string) => void,
): Promise<DiscoveredMetric[]> {
  const allMetrics: DiscoveredMetric[] = [];

  for (const repo of repos) {
    onProgress?.(`Scanning ${repo.owner}/${repo.repo}...`);

    // Find candidate files via code search
    const candidateFiles = new Set<string>();

    for (const query of SEARCH_QUERIES) {
      try {
        const files = await searchCode(repo, query);
        files.forEach((f) => candidateFiles.add(f));
      } catch {
        // Search may fail for some queries, continue
      }
      // Respect GitHub rate limits
      await new Promise((r) => setTimeout(r, 200));
    }

    onProgress?.(`Found ${candidateFiles.size} files with potential metrics in ${repo.name}`);

    // Fetch and parse each candidate file
    for (const filePath of candidateFiles) {
      try {
        const content = await getFileContent(repo, filePath);
        const metrics = extractMetricsFromContent(content, filePath, repo.name);
        allMetrics.push(...metrics);
      } catch {
        // File fetch may fail, continue
      }
    }
  }

  onProgress?.(`Discovered ${allMetrics.length} metrics across ${repos.length} repos`);
  return allMetrics;
}
