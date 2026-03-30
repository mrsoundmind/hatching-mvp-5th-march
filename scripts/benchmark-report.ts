#!/usr/bin/env tsx
/**
 * Hatchin Benchmark Report Generator
 *
 * Reads the latest (or specified) benchmark result JSON and produces
 * a comprehensive markdown report with historical trend comparison.
 *
 * Usage:
 *   npm run benchmark:report              # Latest result
 *   npx tsx scripts/benchmark-report.ts [runId]  # Specific run
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { BenchmarkResult } from './benchmark-types.js';

const HISTORY_DIR = path.join(process.cwd(), 'eval', 'benchmark-history');

// ── Loaders ─────────────────────────────────────────────────────────

async function listResults(): Promise<string[]> {
  try {
    const files = (await fs.readdir(HISTORY_DIR))
      .filter(f => f.endsWith('.json') && !f.includes('report'))
      .sort();
    return files;
  } catch { return []; }
}

async function loadResult(filename: string): Promise<BenchmarkResult> {
  const raw = await fs.readFile(path.join(HISTORY_DIR, filename), 'utf8');
  return JSON.parse(raw);
}

async function loadLatest(): Promise<BenchmarkResult | null> {
  const files = await listResults();
  if (files.length === 0) return null;
  return loadResult(files[files.length - 1]);
}

async function loadHistory(count: number): Promise<BenchmarkResult[]> {
  const files = await listResults();
  const selected = files.slice(-Math.max(1, count));
  const results: BenchmarkResult[] = [];
  for (const f of selected) {
    try { results.push(await loadResult(f)); } catch { /* skip */ }
  }
  return results;
}

// ── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(decimals);
}

function pct(n: number | null | undefined): string {
  return n != null && Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
}

function trend(current: number | null, previous: number | null): string {
  if (current == null || previous == null) return '';
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) return ' → stable';
  return delta > 0 ? ` ↑ +${delta.toFixed(1)}` : ` ↓ ${delta.toFixed(1)}`;
}

function gradeEmoji(grade: string): string {
  switch (grade) {
    case 'A': return '🟢';
    case 'B': return '🔵';
    case 'C': return '🟡';
    case 'D': return '🟠';
    case 'F': return '🔴';
    default: return '⚪';
  }
}

// ── Section Renderers ───────────────────────────────────────────────

function renderHeader(r: BenchmarkResult): string[] {
  return [
    `# Hatchin Agent Benchmark Report`,
    ``,
    `Generated: ${r.generatedAt.slice(0, 19)} | Duration: ${(r.durationMs / 1000).toFixed(1)}s | Run: ${r.runId}`,
    `LLM Keys: Gemini=${r.llmKeysAvailable.gemini ? '✓' : '✗'} OpenAI=${r.llmKeysAvailable.openai ? '✓' : '✗'} Groq=${r.llmKeysAvailable.groq ? '✓' : '✗'}`,
    ``,
  ];
}

function renderHealthScore(r: BenchmarkResult): string[] {
  const hs = r.healthScore;
  const lines = [
    `## ${gradeEmoji(hs.grade)} Overall Health: ${hs.grade} (${hs.overall}/100)`,
    ``,
    `| Section | Score | Weight | Weighted |`,
    `|---------|-------|--------|----------|`,
  ];
  for (const [key, val] of Object.entries(hs.breakdown)) {
    lines.push(`| ${key} | ${fmt(val.score, 0)}% | ${fmt(val.weight, 0)}% | ${fmt(val.weighted)} |`);
  }
  lines.push('');
  return lines;
}

function renderSatisfaction(r: BenchmarkResult, prev?: BenchmarkResult): string[] {
  const s = r.satisfaction;
  const ps = prev?.satisfaction;
  const lines = [
    `## Part A: Are Users Getting Value?`,
    ``,
    `### 1. User Satisfaction`,
    ``,
    `| Metric | Value | Trend |`,
    `|--------|-------|-------|`,
    `| Approval Rate | ${pct(s.approvalRate)} | ${trend(s.approvalRate, ps?.approvalRate)} |`,
    `| Response Quality (1-5) | ${fmt(s.avgQuality)} | ${trend(s.avgQuality, ps?.avgQuality)} |`,
    `| Helpfulness (1-5) | ${fmt(s.avgHelpfulness)} | ${trend(s.avgHelpfulness, ps?.avgHelpfulness)} |`,
    `| Accuracy (1-5) | ${fmt(s.avgAccuracy)} | ${trend(s.avgAccuracy, ps?.avgAccuracy)} |`,
    `| Total Reactions | ${s.totalReactions} (👍 ${s.thumbsUp} / 👎 ${s.thumbsDown}) | |`,
    ``,
  ];

  if (s.byAgent.length > 0) {
    const top = s.byAgent.slice(0, 3);
    const bottom = s.byAgent.filter(a => a.thumbsUp + a.thumbsDown >= 2).slice(-3).reverse();
    if (top.length > 0) lines.push(`**Top agents:** ${top.map(a => `${a.agentName} (${pct(a.approvalRate)})`).join(', ')}`);
    if (bottom.length > 0) lines.push(`**Needs work:** ${bottom.map(a => `${a.agentName} (${pct(a.approvalRate)})`).join(', ')}`);
    lines.push('');
  }

  return lines;
}

function renderTaskValue(r: BenchmarkResult, prev?: BenchmarkResult): string[] {
  const t = r.taskValue;
  const pt = prev?.taskValue;
  return [
    `### 2. Task Value Delivery`,
    ``,
    `| Metric | Value | Trend |`,
    `|--------|-------|-------|`,
    `| AI-Suggested Tasks | ${t.aiSuggested} | |`,
    `| Approval Rate | ${pct(t.approvalRate)} | ${trend(t.approvalRate, pt?.approvalRate)} |`,
    `| Completion Rate | ${pct(t.completionRate)} | ${trend(t.completionRate, pt?.completionRate)} |`,
    `| User-Created Tasks | ${t.userCreated} | |`,
    ``,
  ];
}

function renderConversationQuality(r: BenchmarkResult, prev?: BenchmarkResult): string[] {
  const c = r.conversationQuality;
  const pc = prev?.conversationQuality;
  return [
    `### 3. Conversation Quality`,
    ``,
    `| Metric | Value | Trend |`,
    `|--------|-------|-------|`,
    `| Avg Messages/Conversation | ${fmt(c.avgMessagesPerConversation)} | ${trend(c.avgMessagesPerConversation, pc?.avgMessagesPerConversation)} |`,
    `| First-Response Hit Rate | ${pct(c.firstResponseHitRate)} | ${trend(c.firstResponseHitRate, pc?.firstResponseHitRate)} |`,
    `| Clarification Loop Rate | ${pct(c.clarificationLoopRate)} | ${trend(c.clarificationLoopRate, pc?.clarificationLoopRate)} |`,
    `| Voice Consistency | ${fmt(c.voiceConsistencyScore)} | ${trend(c.voiceConsistencyScore, pc?.voiceConsistencyScore)} |`,
    `| Total Conversations | ${c.totalConversations} | |`,
    ``,
    `> Lower clarification loop rate = better. Higher hit rate = agents understand users on first try.`,
    ``,
  ];
}

function renderKnowledge(r: BenchmarkResult): string[] {
  const k = r.knowledge;
  return [
    `### 4. Knowledge Building`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Memory Entries | ${k.totalMemoryEntries} (${fmt(k.avgMemoriesPerProject)}/project) |`,
    `| Avg Importance | ${fmt(k.avgImportance)}/10 |`,
    `| Projects w/ Brain | ${k.projectsWithBrain}/${k.totalProjects} |`,
    `| Projects w/ Core Direction | ${k.projectsWithCoreDirection}/${k.totalProjects} |`,
    ``,
  ];
}

function renderPersonality(r: BenchmarkResult, prev?: BenchmarkResult): string[] {
  const p = r.personality;
  const pp = prev?.personality;
  return [
    `## Part B: Are Agents Improving?`,
    ``,
    `### 5. Personality Adaptation`,
    ``,
    `| Metric | Value | Trend |`,
    `|--------|-------|-------|`,
    `| Agents w/ Adaptation | ${p.agentsWithAdaptation}/${p.totalAgents} | |`,
    `| Avg Confidence | ${fmt(p.avgAdaptationConfidence, 2)} | ${trend(p.avgAdaptationConfidence, pp?.avgAdaptationConfidence)} |`,
    `| Avg Interactions | ${p.avgInteractionCount} | ${trend(p.avgInteractionCount, pp?.avgInteractionCount)} |`,
    `| Cold Start (< 3) | ${p.coldStartAgents} | |`,
    `| Mature (> 20) | ${p.matureAgents} | |`,
    ``,
  ];
}

function renderTrust(r: BenchmarkResult, prev?: BenchmarkResult): string[] {
  const t = r.trust;
  const pt = prev?.trust;
  return [
    `### 6. Trust Progression`,
    ``,
    `| Metric | Value | Trend |`,
    `|--------|-------|-------|`,
    `| Avg Trust Score | ${fmt(t.avgTrustScore, 2)} | ${trend(t.avgTrustScore, pt?.avgTrustScore)} |`,
    `| Distribution | High: ${t.distribution.high} / Med: ${t.distribution.medium} / Low: ${t.distribution.low} / None: ${t.distribution.noData} | |`,
    `| Fully Mature (10+ tasks) | ${t.fullyMature} | |`,
    `| Avg Completed/Agent | ${fmt(t.avgTasksCompleted)} | |`,
    `| Avg Failed/Agent | ${fmt(t.avgTasksFailed)} | |`,
    ``,
  ];
}

function renderTraining(r: BenchmarkResult): string[] {
  const t = r.training;
  if (!t.available) {
    return [
      `### 7. Training System`,
      ``,
      `> Training stats unavailable (in-memory only, requires running server).`,
      ``,
    ];
  }
  return [
    `### 7. Training System`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Feedback | ${t.totalFeedback} (👍 ${t.goodCount} / 👎 ${t.badCount}) |`,
    `| Success Rate | ${pct(t.successRate)} |`,
    `| Learning Patterns | ${t.learningPatterns} (avg conf: ${fmt(t.avgPatternConfidence, 2)}) |`,
    ``,
  ];
}

function renderCorrelation(r: BenchmarkResult): string[] {
  const c = r.feedbackCorrelation;
  const signalLabel = {
    positive: '✅ POSITIVE — Learning is improving outcomes',
    negative: '⚠️ NEGATIVE — Adapted agents score lower (investigate)',
    neutral: '➡️ NEUTRAL — No significant difference',
    insufficient_data: '❓ Insufficient data',
  }[c.correlationSignal];

  return [
    `### 8. Feedback → Quality Correlation`,
    ``,
    `**Signal: ${signalLabel}**`,
    ``,
    `| Group | Satisfaction |`,
    `|-------|-------------|`,
    `| High adaptation confidence (> 0.6) | ${pct(c.highAdaptationSatisfaction)} |`,
    `| Low adaptation confidence (≤ 0.6) | ${pct(c.lowAdaptationSatisfaction)} |`,
    `| High trust (> 0.5) | ${pct(c.highTrustSatisfaction)} |`,
    `| Low trust (≤ 0.5) | ${pct(c.lowTrustSatisfaction)} |`,
    ``,
    `> If learning works, adapted/trusted agents should score higher. This is the key metric.`,
    ``,
  ];
}

function renderSystemHealth(r: BenchmarkResult): string[] {
  const lines = [
    `## Part C: Is the System Working?`,
    ``,
    `| Gate | Status | Detail |`,
    `|------|--------|--------|`,
  ];

  // Intelligence
  if (r.intelligence.skipped) {
    lines.push(`| Intelligence | ⊘ Skipped | No LLM keys |`);
  } else {
    const driftStatus = r.intelligence.drift?.driftDetected ? '⚠️ DRIFT' : 'No drift';
    lines.push(`| Intelligence | ${fmt(r.intelligence.smartnessScore, 1)}/${r.intelligence.smartnessMax} | ${driftStatus} |`);
  }

  // Routing
  lines.push(`| Routing | ${r.routing.verdict.toUpperCase()} | ${pct(r.routing.overallAccuracy)} accuracy |`);

  // Autonomy
  lines.push(`| Autonomy | ${pct(r.autonomy.executionSuccessRate)} success | ${r.autonomy.totalEvents} events, ${r.autonomy.handoffCount} handoffs |`);

  // Safety
  lines.push(`| Safety | ${r.safety.verdict.toUpperCase()} | ${fmt(r.safety.interventionRate)}% intervention rate |`);

  // Latency
  lines.push(`| Latency | ${r.latency.verdict} | p50: ${r.latency.overall.p50}ms, p95: ${r.latency.overall.p95}ms |`);

  // Cost
  lines.push(`| Cost | $${(r.cost.totalCostCents / 100).toFixed(2)} total | $${r.cost.costPerMessage.toFixed(4)}/msg, Groq savings: ${r.cost.groqSavingsPercent}% |`);

  // Quality tests
  const allPass = r.qualityTests.every(t => t.passed);
  const totalTests = r.qualityTests.reduce((sum, t) => sum + t.testCount, 0);
  lines.push(`| Quality Tests | ${allPass ? 'ALL PASS' : 'FAILED'} | ${totalTests} tests |`);

  lines.push('');

  // Latency breakdown
  if (Object.keys(r.latency.byClass).length > 0) {
    lines.push(`### Latency by Class`);
    lines.push(``);
    lines.push(`| Class | Count | p50 | p95 |`);
    lines.push(`|-------|-------|-----|-----|`);
    for (const [cls, stats] of Object.entries(r.latency.byClass)) {
      lines.push(`| ${cls} | ${stats.count} | ${stats.p50}ms | ${stats.p95}ms |`);
    }
    lines.push('');
  }

  // Cost trend
  if (r.cost.last7Days.length > 0) {
    lines.push(`### Cost Trend (Last 7 Days)`);
    lines.push(``);
    lines.push(`| Date | Messages | Tokens | Cost |`);
    lines.push(`|------|----------|--------|------|`);
    for (const d of r.cost.last7Days) {
      lines.push(`| ${d.date} | ${d.messages} | ${d.tokens} | $${(d.costCents / 100).toFixed(2)} |`);
    }
    lines.push('');
  }

  // Autonomy events breakdown
  if (Object.keys(r.autonomy.eventsByType).length > 0) {
    lines.push(`### Autonomy Event Distribution`);
    lines.push(``);
    lines.push(`| Event Type | Count |`);
    lines.push(`|------------|-------|`);
    const sorted = Object.entries(r.autonomy.eventsByType).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sorted.slice(0, 15)) {
      lines.push(`| ${type} | ${count} |`);
    }
    lines.push('');
  }

  return lines;
}

function renderTrends(history: BenchmarkResult[]): string[] {
  if (history.length < 2) {
    return [
      `## Historical Trends`,
      ``,
      `> Run the benchmark multiple times to see trends.`,
      ``,
    ];
  }

  const lines = [
    `## Historical Trends (Last ${history.length} Runs)`,
    ``,
    `| Date | Health | Satisfaction | Trust | Hit Rate | Intelligence |`,
    `|------|--------|-------------|-------|----------|-------------|`,
  ];

  for (const r of history.reverse()) {
    const date = r.generatedAt.slice(0, 10);
    lines.push(`| ${date} | ${r.healthScore.grade} ${r.healthScore.overall} | ${pct(r.satisfaction.approvalRate)} | ${fmt(r.trust.avgTrustScore, 2)} | ${pct(r.conversationQuality.firstResponseHitRate)} | ${fmt(r.intelligence.smartnessScore)}/${r.intelligence.smartnessMax} |`);
  }

  lines.push('');
  return lines;
}

function renderQualityTests(r: BenchmarkResult): string[] {
  const lines = [
    `## Quality Gate Tests`,
    ``,
  ];
  for (const t of r.qualityTests) {
    const icon = t.passed ? '✅' : '❌';
    lines.push(`- ${icon} **${t.name}**: ${t.passed ? 'PASS' : 'FAIL'} (${t.testCount} tests)${t.error ? ` — ${t.error}` : ''}`);
  }
  lines.push('');
  return lines;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const targetRunId = process.argv[2];

  let result: BenchmarkResult | null;
  if (targetRunId) {
    const files = await listResults();
    const match = files.find(f => f.includes(targetRunId));
    if (!match) { console.error(`No result found for run ID: ${targetRunId}`); process.exit(1); }
    result = await loadResult(match);
  } else {
    result = await loadLatest();
  }

  if (!result) {
    console.error('No benchmark results found. Run `npm run benchmark` first.');
    process.exit(1);
  }

  const history = await loadHistory(5);
  const prev = history.length >= 2 ? history[history.length - 2] : undefined;

  // Build report
  const lines = [
    ...renderHeader(result),
    ...renderHealthScore(result),
    ...renderSatisfaction(result, prev),
    ...renderTaskValue(result, prev),
    ...renderConversationQuality(result, prev),
    ...renderKnowledge(result),
    ...renderPersonality(result, prev),
    ...renderTrust(result, prev),
    ...renderTraining(result),
    ...renderCorrelation(result),
    ...renderSystemHealth(result),
    ...renderTrends(history),
    ...renderQualityTests(result),
    `---`,
    `*Generated by Hatchin Benchmark Suite*`,
  ];

  const markdown = lines.join('\n');

  // Write report file
  const reportPath = path.join(HISTORY_DIR, `${result.runId}-report.md`);
  await fs.writeFile(reportPath, markdown, 'utf8');

  // Print to stdout
  console.log(markdown);
  console.log(`\nReport saved: ${reportPath}`);
}

main().catch((err) => {
  console.error('Report generation failed:', err);
  process.exit(1);
});
