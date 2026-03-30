/**
 * Reasoning Pattern Cache — Phase 6, Billing Milestone (v1.2)
 *
 * Caches successful reasoning patterns and injects hints for similar future
 * questions. Pure in-memory, ephemeral (no DB persistence needed).
 *
 * Key: (projectId, role, category)
 * TTL: 1 hour
 * Max entries: 200 (LRU-style eviction of oldest)
 */

export interface ReasoningPattern {
  role: string;
  category: string;
  structure: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 200;

const cache = new Map<string, ReasoningPattern>();

// ---------------------------------------------------------------------------
// Category keywords
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  technical: [
    'code', 'bug', 'api', 'database', 'deploy', 'server', 'function',
    'error', 'debug', 'endpoint', 'query', 'migration', 'typescript',
    'backend', 'frontend', 'refactor', 'test', 'compile', 'build',
  ],
  planning: [
    'roadmap', 'timeline', 'sprint', 'milestone', 'priority', 'deadline',
    'schedule', 'plan', 'scope', 'backlog', 'estimate', 'phase',
  ],
  creative: [
    'design', 'brand', 'logo', 'copy', 'visual', 'aesthetic', 'style',
    'color', 'layout', 'typography', 'illustration', 'mockup',
  ],
  analytical: [
    'data', 'metric', 'analyze', 'report', 'chart', 'trend', 'insight',
    'kpi', 'dashboard', 'conversion', 'retention', 'funnel', 'segment',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildKey(projectId: string, role: string, category: string): string {
  return `${projectId}::${role}::${category}`;
}

function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, pattern] of cache) {
    if (pattern.cachedAt < oldestTime) {
      oldestTime = pattern.cachedAt;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
  }
}

function isExpired(pattern: ReasoningPattern): boolean {
  return Date.now() - pattern.cachedAt > CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a user message into a reasoning category using keyword heuristics.
 * No LLM call — pure string matching.
 */
export function classifyMessageCategory(message: string): string {
  const lower = message.toLowerCase();

  const scores: Record<string, number> = {
    technical: 0,
    planning: 0,
    creative: 0,
    analytical: 0,
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        scores[category]++;
      }
    }
  }

  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Cache a reasoning pattern after a high-confidence response.
 * Evicts the oldest entry when the cache exceeds MAX_CACHE_SIZE.
 */
export function cacheReasoningPattern(
  projectId: string,
  role: string,
  userMessage: string,
  responseStructure: string,
): void {
  const category = classifyMessageCategory(userMessage);
  const key = buildKey(projectId, role, category);

  // Evict oldest if at capacity and this is a new key
  if (!cache.has(key) && cache.size >= MAX_CACHE_SIZE) {
    evictOldest();
  }

  cache.set(key, {
    role,
    category,
    structure: responseStructure,
    cachedAt: Date.now(),
  });
}

/**
 * Look up a cached reasoning hint for the given context.
 * Returns a hint string to inject into the system prompt, or null if no match.
 * Expired entries are evicted on access.
 */
export function getReasoningHint(
  projectId: string,
  role: string,
  userMessage: string,
): string | null {
  const category = classifyMessageCategory(userMessage);
  const key = buildKey(projectId, role, category);
  const pattern = cache.get(key);

  if (!pattern) {
    return null;
  }

  if (isExpired(pattern)) {
    cache.delete(key);
    return null;
  }

  return `In a previous similar context, the approach was: ${pattern.structure}. Consider this structure.`;
}

/**
 * Clear all cached reasoning patterns for a project.
 * Useful when project context changes significantly.
 */
export function clearProjectCache(projectId: string): void {
  const prefix = `${projectId}::`;

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
