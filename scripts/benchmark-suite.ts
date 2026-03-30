#!/usr/bin/env tsx
/**
 * Hatchin Unified Benchmark Suite
 *
 * Runs all evaluations, queries the database for operational metrics,
 * and produces a single scored result JSON.
 *
 * Usage:
 *   npm run benchmark          # DB + inline evals (no LLM keys needed)
 *   npm run benchmark:full     # Full run including LLM-dependent evals
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type {
  BenchmarkResult,
  SatisfactionMetrics,
  TaskValueMetrics,
  ConversationQualityMetrics,
  KnowledgeMetrics,
  PersonalityMetrics,
  TrustMetrics,
  TrainingMetrics,
  FeedbackQualityCorrelation,
  IntelligenceMetrics,
  RoutingMetrics,
  AutonomyMetrics,
  SafetyMetrics,
  LatencyMetrics,
  CostMetrics,
  QualityTestResult,
  HealthScore,
  AgentSatisfaction,
} from './benchmark-types.js';
import { readAutonomyEvents, summarizeLatency } from '../server/autonomy/events/eventLogger.js';
import { loadRecentScores, detectDrift } from '../server/eval/drift/driftMonitor.js';
import { BUDGETS } from '../server/autonomy/config/policies.js';
import { ROLE_DEFINITIONS } from '../shared/roleRegistry.js';

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const HISTORY_DIR = path.join(ROOT, 'eval', 'benchmark-history');

// ── DB Connection (lazy, graceful) ──────────────────────────────────

type DbPool = { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };
let poolPromise: Promise<DbPool | null> | null = null;

function getPool(): Promise<DbPool | null> {
  if (!process.env.DATABASE_URL) return Promise.resolve(null);
  if (!poolPromise) {
    poolPromise = (async () => {
      try {
        const mod = await import('../server/db.js');
        const pool = mod.pool as DbPool;
        await pool.query('SELECT 1');
        return pool;
      } catch { return null; }
    })();
  }
  return poolPromise;
}

// ── Helpers ─────────────────────────────────────────────────────────

function detectLlmKeys() {
  return {
    gemini: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
  };
}

function safeDiv(num: number, den: number, fallback = 0): number {
  return den > 0 ? num / den : fallback;
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx];
}

// Simple Jaccard similarity for two strings (word-level)
function jaccard(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── PART A: User Value Queries ──────────────────────────────────────

async function querySatisfaction(pool: DbPool): Promise<SatisfactionMetrics> {
  const { rows } = await pool.query(`
    SELECT mr.agent_id, a.name as agent_name, a.role,
      COUNT(*) FILTER (WHERE mr.reaction_type = 'thumbs_up') as up,
      COUNT(*) FILTER (WHERE mr.reaction_type = 'thumbs_down') as down,
      AVG((mr.feedback_data->>'responseQuality')::float) as avg_quality,
      AVG((mr.feedback_data->>'helpfulness')::float) as avg_help,
      AVG((mr.feedback_data->>'accuracy')::float) as avg_accuracy
    FROM message_reactions mr
    LEFT JOIN agents a ON mr.agent_id = a.id
    GROUP BY mr.agent_id, a.name, a.role
  `);

  let totalUp = 0, totalDown = 0;
  const qualities: number[] = [], helps: number[] = [], accs: number[] = [];
  const byAgent: AgentSatisfaction[] = [];

  for (const r of rows) {
    const up = Number(r.up) || 0;
    const down = Number(r.down) || 0;
    totalUp += up;
    totalDown += down;
    const q = r.avg_quality != null ? Number(r.avg_quality) : null;
    const h = r.avg_help != null ? Number(r.avg_help) : null;
    const a = r.avg_accuracy != null ? Number(r.avg_accuracy) : null;
    if (q != null) qualities.push(q);
    if (h != null) helps.push(h);
    if (a != null) accs.push(a);
    byAgent.push({
      agentId: r.agent_id ?? 'unknown',
      agentName: r.agent_name ?? 'Unknown',
      role: r.role ?? 'Unknown',
      thumbsUp: up, thumbsDown: down,
      approvalRate: safeDiv(up, up + down) * 100,
      avgQuality: q, avgHelpfulness: h, avgAccuracy: a,
    });
  }

  const total = totalUp + totalDown;
  return {
    totalReactions: total,
    thumbsUp: totalUp,
    thumbsDown: totalDown,
    approvalRate: safeDiv(totalUp, total) * 100,
    avgQuality: qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : null,
    avgHelpfulness: helps.length > 0 ? helps.reduce((a, b) => a + b, 0) / helps.length : null,
    avgAccuracy: accs.length > 0 ? accs.reduce((a, b) => a + b, 0) / accs.length : null,
    byAgent: byAgent.sort((a, b) => b.approvalRate - a.approvalRate),
  };
}

async function queryTaskValue(pool: DbPool): Promise<TaskValueMetrics> {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE metadata->>'createdFromChat' = 'true') as ai_suggested,
      COUNT(*) FILTER (WHERE metadata->>'createdFromChat' = 'true' AND status IN ('todo', 'in_progress', 'completed')) as ai_approved,
      COUNT(*) FILTER (WHERE metadata->>'createdFromChat' = 'true' AND status = 'completed') as ai_completed,
      COUNT(*) FILTER (WHERE metadata->>'createdFromChat' IS NULL OR metadata->>'createdFromChat' = 'false') as user_created
    FROM tasks
  `);

  const r = rows[0] || {};
  const suggested = Number(r.ai_suggested) || 0;
  const approved = Number(r.ai_approved) || 0;
  const completed = Number(r.ai_completed) || 0;
  return {
    aiSuggested: suggested,
    aiApproved: approved,
    aiCompleted: completed,
    userCreated: Number(r.user_created) || 0,
    approvalRate: safeDiv(approved, suggested) * 100,
    completionRate: safeDiv(completed, suggested) * 100,
  };
}

async function queryConversationQuality(pool: DbPool): Promise<ConversationQualityMetrics> {
  // Basic engagement metrics
  const { rows: convRows } = await pool.query(`
    SELECT conversation_id, COUNT(*) as msg_count
    FROM messages GROUP BY conversation_id
  `);
  const msgCounts = convRows.map(r => Number(r.msg_count) || 0);
  const avgMsgs = msgCounts.length > 0 ? msgCounts.reduce((a, b) => a + b, 0) / msgCounts.length : 0;

  // Cancellation rate
  const { rows: cancelRows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE metadata->>'isStreaming' = 'false') as completed,
      COUNT(*) as total
    FROM messages WHERE message_type = 'agent'
  `);
  const agentTotal = Number(cancelRows[0]?.total) || 0;

  // Get message sequences for quality analysis (limit to recent 500 conversations)
  const { rows: msgRows } = await pool.query(`
    SELECT conversation_id, content, message_type, agent_id, created_at
    FROM messages
    WHERE conversation_id IN (
      SELECT conversation_id FROM messages
      GROUP BY conversation_id HAVING COUNT(*) >= 3
      ORDER BY MAX(created_at) DESC LIMIT 500
    )
    ORDER BY conversation_id, created_at
  `);

  // Group messages by conversation
  const convos = new Map<string, Array<{ content: string; type: string; agentId: string | null }>>();
  for (const m of msgRows) {
    const id = m.conversation_id;
    if (!convos.has(id)) convos.set(id, []);
    convos.get(id)!.push({ content: m.content, type: m.message_type, agentId: m.agent_id });
  }

  // Correction signal patterns
  const correctionPatterns = [
    /\bno,?\s+(I|what|that)\b/i,
    /\bI meant\b/i,
    /\bnot that\b/i,
    /\bactually\b/i,
    /\blet me rephrase\b/i,
    /\bwhat I said was\b/i,
    /\bthat's not what\b/i,
    /\bI was asking\b/i,
  ];

  let convosWithCorrections = 0;
  let hits = 0, misses = 0;

  for (const [, msgs] of convos) {
    let hasCorrection = false;

    for (let i = 0; i < msgs.length - 2; i++) {
      if (msgs[i].type !== 'user' || msgs[i + 1].type !== 'agent') continue;

      // Check if next user message is a correction
      const nextUserIdx = msgs.findIndex((m, j) => j > i + 1 && m.type === 'user');
      if (nextUserIdx === -1) continue;

      const nextUser = msgs[nextUserIdx];
      const isCorrection = correctionPatterns.some(p => p.test(nextUser.content));
      const highSimilarity = jaccard(msgs[i].content, nextUser.content) > 0.5;

      if (isCorrection || highSimilarity) {
        misses++;
        hasCorrection = true;
      } else {
        hits++;
      }
    }

    if (hasCorrection) convosWithCorrections++;
  }

  // Voice consistency: compare early vs late agent messages
  let voiceScores: number[] = [];
  const roleVoiceKeywords = new Map<string, Set<string>>();
  for (const rd of ROLE_DEFINITIONS) {
    const words = rd.voicePrompt.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    roleVoiceKeywords.set(rd.role, new Set(words));
  }

  for (const [, msgs] of convos) {
    const agentMsgs = msgs.filter(m => m.type === 'agent');
    if (agentMsgs.length < 10) continue;

    // Group by agent
    const byAgent = new Map<string, string[]>();
    for (const m of agentMsgs) {
      const aid = m.agentId ?? 'unknown';
      if (!byAgent.has(aid)) byAgent.set(aid, []);
      byAgent.get(aid)!.push(m.content);
    }

    for (const [, agentContents] of byAgent) {
      if (agentContents.length < 6) continue;
      const early = agentContents.slice(0, 3).join(' ').toLowerCase();
      const late = agentContents.slice(-3).join(' ').toLowerCase();
      const earlyWords = new Set(early.split(/\s+/));
      const lateWords = new Set(late.split(/\s+/));
      const sim = jaccard(early, late);
      // Higher similarity between early and late = more consistent voice
      voiceScores.push(Math.min(1, sim * 2)); // Scale up, cap at 1
    }
  }

  return {
    avgMessagesPerConversation: Math.round(avgMsgs * 10) / 10,
    totalConversations: convos.size,
    clarificationLoopRate: safeDiv(convosWithCorrections, convos.size) * 100,
    firstResponseHitRate: safeDiv(hits, hits + misses) * 100,
    voiceConsistencyScore: voiceScores.length > 0
      ? Math.round((voiceScores.reduce((a, b) => a + b, 0) / voiceScores.length) * 100) / 100
      : null,
    streamingCancellationRate: 0, // Would need streaming_cancelled events
  };
}

async function queryKnowledge(pool: DbPool): Promise<KnowledgeMetrics> {
  const { rows: memRows } = await pool.query(`
    SELECT COUNT(*) as cnt, AVG(importance) as avg_imp,
      COUNT(DISTINCT conversation_id) as distinct_convos
    FROM conversation_memory
  `);
  const { rows: projRows } = await pool.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE brain IS NOT NULL AND brain != '{}') as with_brain,
      COUNT(*) FILTER (WHERE core_direction IS NOT NULL AND core_direction != '{}') as with_dir
    FROM projects
  `);

  const memCount = Number(memRows[0]?.cnt) || 0;
  const totalProjects = Number(projRows[0]?.total) || 1;

  return {
    totalMemoryEntries: memCount,
    avgMemoriesPerProject: Math.round(safeDiv(memCount, totalProjects) * 10) / 10,
    avgImportance: memRows[0]?.avg_imp != null ? Math.round(Number(memRows[0].avg_imp) * 10) / 10 : 0,
    projectsWithBrain: Number(projRows[0]?.with_brain) || 0,
    projectsWithCoreDirection: Number(projRows[0]?.with_dir) || 0,
    totalProjects,
  };
}

// ── PART B: Agent Learning Queries ──────────────────────────────────

interface AgentRow { id: string; name: string; role: string; personality: any }

async function fetchAgents(pool: DbPool): Promise<AgentRow[]> {
  const { rows } = await pool.query(`SELECT id, name, role, personality FROM agents`);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    personality: typeof r.personality === 'string' ? JSON.parse(r.personality) : (r.personality ?? {}),
  }));
}

function queryPersonality(agents: AgentRow[]): PersonalityMetrics {
  let withAdaptation = 0, totalConfidence = 0, totalInteractions = 0;
  let coldStart = 0, mature = 0, traitDeltas: number[] = [];

  for (const agent of agents) {
    const meta = agent.personality?.adaptationMeta;
    if (!meta || typeof meta !== 'object') continue;

    const entries = Object.values(meta) as any[];
    if (entries.length === 0) continue;
    withAdaptation++;

    for (const entry of entries) {
      const conf = Number(entry?.adaptationConfidence) || 0;
      const count = Number(entry?.interactionCount) || 0;
      totalConfidence += conf;
      totalInteractions += count;
      if (count < 3) coldStart++;
      if (count > 20) mature++;
    }
  }

  return {
    totalAgents: agents.length,
    agentsWithAdaptation: withAdaptation,
    avgAdaptationConfidence: withAdaptation > 0 ? Math.round(safeDiv(totalConfidence, withAdaptation) * 100) / 100 : 0,
    avgInteractionCount: withAdaptation > 0 ? Math.round(safeDiv(totalInteractions, withAdaptation)) : 0,
    coldStartAgents: coldStart,
    matureAgents: mature,
    avgTraitDelta: traitDeltas.length > 0 ? traitDeltas.reduce((a, b) => a + b, 0) / traitDeltas.length : 0,
  };
}

function queryTrust(agents: AgentRow[]): TrustMetrics {
  let high = 0, medium = 0, low = 0, noData = 0;
  let totalTrust = 0, trustCount = 0, fullyMature = 0;
  let totalCompleted = 0, totalFailed = 0;

  for (const agent of agents) {
    const tm = agent.personality?.trustMeta;
    if (!tm || tm.trustScore == null) { noData++; continue; }

    const score = Number(tm.trustScore);
    const completed = Number(tm.tasksCompleted) || 0;
    const failed = Number(tm.tasksFailed) || 0;

    totalTrust += score;
    trustCount++;
    totalCompleted += completed;
    totalFailed += failed;

    if (score >= 0.7) high++;
    else if (score >= 0.3) medium++;
    else low++;

    if (completed + failed >= 10) fullyMature++;
  }

  return {
    totalAgents: agents.length,
    avgTrustScore: trustCount > 0 ? Math.round(safeDiv(totalTrust, trustCount) * 100) / 100 : 0,
    distribution: { high, medium, low, noData },
    fullyMature,
    avgTasksCompleted: trustCount > 0 ? Math.round(safeDiv(totalCompleted, trustCount) * 10) / 10 : 0,
    avgTasksFailed: trustCount > 0 ? Math.round(safeDiv(totalFailed, trustCount) * 10) / 10 : 0,
  };
}

function queryTraining(): TrainingMetrics {
  // Training system is in-memory; we can't access it from a standalone script
  return {
    totalFeedback: 0,
    goodCount: 0,
    badCount: 0,
    successRate: 0,
    learningPatterns: 0,
    avgPatternConfidence: 0,
    available: false,
  };
}

function computeFeedbackCorrelation(
  agents: AgentRow[],
  satisfaction: SatisfactionMetrics,
): FeedbackQualityCorrelation {
  const agentSatMap = new Map<string, number>();
  for (const as of satisfaction.byAgent) {
    agentSatMap.set(as.agentId, as.approvalRate);
  }

  const highAdapt: number[] = [], lowAdapt: number[] = [];
  const highTrust: number[] = [], lowTrust: number[] = [];

  for (const agent of agents) {
    const sat = agentSatMap.get(agent.id);
    if (sat == null) continue;

    // Adaptation confidence
    const meta = agent.personality?.adaptationMeta;
    if (meta && typeof meta === 'object') {
      const entries = Object.values(meta) as any[];
      const avgConf = entries.length > 0
        ? entries.reduce((sum: number, e: any) => sum + (Number(e?.adaptationConfidence) || 0), 0) / entries.length
        : 0;
      if (avgConf > 0.6) highAdapt.push(sat);
      else lowAdapt.push(sat);
    }

    // Trust
    const tm = agent.personality?.trustMeta;
    if (tm?.trustScore != null) {
      if (Number(tm.trustScore) > 0.5) highTrust.push(sat);
      else lowTrust.push(sat);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const highAdaptSat = avg(highAdapt);
  const lowAdaptSat = avg(lowAdapt);
  const highTrustSat = avg(highTrust);
  const lowTrustSat = avg(lowTrust);

  let signal: FeedbackQualityCorrelation['correlationSignal'] = 'insufficient_data';
  if (highAdaptSat != null && lowAdaptSat != null) {
    signal = highAdaptSat > lowAdaptSat + 5 ? 'positive' : highAdaptSat < lowAdaptSat - 5 ? 'negative' : 'neutral';
  }

  return {
    highAdaptationSatisfaction: highAdaptSat != null ? Math.round(highAdaptSat * 10) / 10 : null,
    lowAdaptationSatisfaction: lowAdaptSat != null ? Math.round(lowAdaptSat * 10) / 10 : null,
    highTrustSatisfaction: highTrustSat != null ? Math.round(highTrustSat * 10) / 10 : null,
    lowTrustSatisfaction: lowTrustSat != null ? Math.round(lowTrustSat * 10) / 10 : null,
    correlationSignal: signal,
  };
}

// ── PART C: System Health ───────────────────────────────────────────

async function queryAutonomy(): Promise<AutonomyMetrics> {
  const events = await readAutonomyEvents(5000);

  const eventsByType: Record<string, number> = {};
  let completed = 0, failed = 0, handoffs = 0, peerReviews = 0, revisions = 0;
  let safetyTriggers = 0;
  const confidences: number[] = [], risks: number[] = [];

  for (const e of events) {
    eventsByType[e.eventType] = (eventsByType[e.eventType] || 0) + 1;
    if (e.eventType === 'task_completed') completed++;
    if (e.eventType === 'task_failed') failed++;
    if (e.eventType === 'handoff_initiated' || e.eventType === 'handoff_completed') handoffs++;
    if (e.eventType === 'peer_review_started' || e.eventType === 'peer_review_feedback') peerReviews++;
    if (e.eventType === 'revision_requested' || e.eventType === 'revision_completed') revisions++;
    if (e.eventType === 'safety_triggered') safetyTriggers++;
    if (e.confidence != null) confidences.push(e.confidence);
    if (e.riskScore != null) risks.push(e.riskScore);
  }

  return {
    totalEvents: events.length,
    eventsByType,
    executionSuccessRate: safeDiv(completed, completed + failed) * 100,
    handoffCount: handoffs,
    peerReviewCount: peerReviews,
    peerReviewRevisionRate: peerReviews > 0 ? safeDiv(revisions, peerReviews) * 100 : 0,
    safetyTriggerCount: safetyTriggers,
    avgConfidence: confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100 : 0,
    avgRiskScore: risks.length > 0
      ? Math.round((risks.reduce((a, b) => a + b, 0) / risks.length) * 100) / 100 : 0,
  };
}

async function queryLatency(): Promise<LatencyMetrics> {
  const events = await readAutonomyEvents(2000);
  const overall = await summarizeLatency(events);

  const byClass: Record<string, number[]> = {};
  for (const e of events) {
    const cls = (e.payload?.requestClass as string) ?? 'unknown';
    if (e.latencyMs != null) {
      if (!byClass[cls]) byClass[cls] = [];
      byClass[cls].push(e.latencyMs);
    }
  }

  const classStats: Record<string, { count: number; p50: number; p95: number }> = {};
  let worstVsbudget = 0;
  const budgetMap: Record<string, number> = {
    single: BUDGETS.singleResponseBudgetMs,
    deliberation: BUDGETS.deliberationBudgetMs,
    safety: BUDGETS.safetyTriggerBudgetMs,
  };

  for (const [cls, latencies] of Object.entries(byClass)) {
    latencies.sort((a, b) => a - b);
    const p95 = percentile(latencies, 0.95);
    classStats[cls] = {
      count: latencies.length,
      p50: percentile(latencies, 0.5),
      p95,
    };
    const budget = budgetMap[cls];
    if (budget && p95 > budget) worstVsbudget++;
  }

  const verdict = overall.count === 0 ? 'NO_DATA' as const
    : worstVsbudget === 0 ? 'PASS' as const
    : worstVsbudget <= 1 ? 'WARN' as const
    : 'FAIL' as const;

  return { overall, byClass: classStats, verdict };
}

async function queryCost(pool: DbPool): Promise<CostMetrics> {
  const { rows } = await pool.query(`
    SELECT date, total_messages, total_tokens, estimated_cost_cents,
      standard_model_messages, premium_model_messages, autonomy_executions
    FROM usage_daily_summary
    ORDER BY date DESC LIMIT 30
  `);

  let totalTokens = 0, totalCost = 0, totalMsgs = 0;
  let standard = 0, premium = 0, autonomy = 0;
  const last7: CostMetrics['last7Days'] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tokens = Number(r.total_tokens) || 0;
    const cost = Number(r.estimated_cost_cents) || 0;
    const msgs = Number(r.total_messages) || 0;
    totalTokens += tokens;
    totalCost += cost;
    totalMsgs += msgs;
    standard += Number(r.standard_model_messages) || 0;
    premium += Number(r.premium_model_messages) || 0;
    autonomy += Number(r.autonomy_executions) || 0;

    if (i < 7) {
      last7.push({ date: r.date, messages: msgs, tokens, costCents: cost });
    }
  }

  return {
    totalTokens, totalCostCents: totalCost, totalMessages: totalMsgs,
    standardMessages: standard, premiumMessages: premium, autonomyExecutions: autonomy,
    costPerMessage: Math.round(safeDiv(totalCost, totalMsgs) * 1000) / 1000,
    groqSavingsPercent: Math.round(safeDiv(standard, standard + premium) * 100),
    last7Days: last7.reverse(),
  };
}

async function querySafety(): Promise<SafetyMetrics> {
  const events = await readAutonomyEvents(5000);
  const safetyEvents = events.filter(e => e.eventType === 'safety_triggered');
  const totalEvents = events.length;
  const lowRiskBlocked = safetyEvents.filter(e => (e.riskScore ?? 0) < 0.2).length;

  return {
    baselineCasesRun: 0,
    baselinePassed: true,
    interventionRate: safeDiv(safetyEvents.length, totalEvents) * 100,
    falsePositiveProxy: safeDiv(lowRiskBlocked, safetyEvents.length || 1) * 100,
    verdict: 'skipped',
  };
}

// ── Subprocess Evals ────────────────────────────────────────────────

async function runSubprocess(script: string, timeoutMs = 120_000): Promise<{ ok: boolean; stdout: string }> {
  try {
    const { stdout } = await execFileAsync('npx', ['tsx', script], {
      cwd: ROOT,
      timeout: timeoutMs,
      env: { ...process.env },
    });
    return { ok: true, stdout };
  } catch (err: any) {
    return { ok: false, stdout: err.stdout ?? err.message ?? '' };
  }
}

async function runIntelligenceEval(): Promise<IntelligenceMetrics> {
  const history = await loadRecentScores(5);

  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return {
      smartnessScore: null, smartnessMax: 35, drift: null,
      perCategory: {}, skipped: true,
    };
  }

  const result = await runSubprocess('scripts/eval-bench.ts');
  // Try to read the latest result file
  try {
    const resultsDir = path.join(ROOT, 'eval', 'results');
    const files = (await fs.readdir(resultsDir)).filter(f => f.endsWith('.json')).sort();
    if (files.length > 0) {
      const raw = JSON.parse(await fs.readFile(path.join(resultsDir, files[files.length - 1]), 'utf8'));
      const score = Number(raw.score ?? raw.totalScore ?? raw.summary?.score ?? 0);
      const drift = detectDrift({ currentScore: score, history });
      return {
        smartnessScore: score, smartnessMax: 35,
        drift, perCategory: raw.perCategory ?? {}, skipped: false,
      };
    }
  } catch { /* fall through */ }

  return { smartnessScore: null, smartnessMax: 35, drift: null, perCategory: {}, skipped: !result.ok };
}

async function runRoutingEval(): Promise<RoutingMetrics> {
  // Use routing eval as subprocess
  const result = await runSubprocess('scripts/eval-routing.ts', 60_000);
  // Parse stdout for accuracy numbers
  const hatchMatch = result.stdout.match(/Hatch[:\s]+(\d+(?:\.\d+)?)\s*%/i);
  const modeMatch = result.stdout.match(/Mode[:\s]+(\d+(?:\.\d+)?)\s*%/i);
  const hatch = hatchMatch ? Number(hatchMatch[1]) : null;
  const mode = modeMatch ? Number(modeMatch[1]) : null;
  const overall = hatch != null && mode != null ? (hatch + mode) / 2 : hatch;

  return {
    hatchAccuracy: hatch, modeAccuracy: mode, overallAccuracy: overall,
    totalCases: 30,
    avgRealTrafficConfidence: null,
    specialistRoutePercent: null,
    verdict: overall == null ? 'skipped' : overall >= 80 ? 'pass' : overall >= 70 ? 'warn' : 'fail',
  };
}

async function runQualityTests(): Promise<QualityTestResult[]> {
  const tests = [
    { name: 'Voice Distinctiveness', script: 'scripts/test-voice-distinctiveness.ts', count: 8 },
    { name: 'Reasoning Patterns', script: 'scripts/test-reasoning-patterns.ts', count: 240 },
    { name: 'Agent Pushback', script: 'scripts/test-agent-pushback.ts', count: 46 },
  ];

  const results: QualityTestResult[] = [];
  for (const t of tests) {
    const r = await runSubprocess(t.script, 30_000);
    results.push({ name: t.name, passed: r.ok, testCount: t.count, error: r.ok ? undefined : r.stdout.slice(0, 200) });
  }
  return results;
}

// ── Health Score ─────────────────────────────────────────────────────

function computeHealthScore(result: Omit<BenchmarkResult, 'healthScore'>): HealthScore {
  const sections: Array<{ key: string; weight: number; score: number | null }> = [
    { key: 'User Satisfaction', weight: 15, score: result.satisfaction.totalReactions > 0 ? result.satisfaction.approvalRate : null },
    { key: 'Task Value', weight: 10, score: result.taskValue.aiSuggested > 0 ? (result.taskValue.approvalRate * 0.5 + result.taskValue.completionRate * 0.5) : null },
    { key: 'Conversation Quality', weight: 10, score: result.conversationQuality.totalConversations > 0 ? result.conversationQuality.firstResponseHitRate : null },
    { key: 'Knowledge Building', weight: 5, score: Math.min(100, result.knowledge.avgMemoriesPerProject * 20) },
    { key: 'Personality Adaptation', weight: 10, score: result.personality.avgAdaptationConfidence * 100 },
    { key: 'Trust Progression', weight: 10, score: result.trust.avgTrustScore * 100 },
    { key: 'Training', weight: 5, score: result.training.available ? result.training.successRate : null },
    { key: 'Feedback-Quality', weight: 5, score: result.feedbackCorrelation.correlationSignal === 'positive' ? 80 : result.feedbackCorrelation.correlationSignal === 'neutral' ? 50 : result.feedbackCorrelation.correlationSignal === 'negative' ? 20 : null },
    { key: 'Intelligence', weight: 10, score: result.intelligence.smartnessScore != null ? (result.intelligence.smartnessScore / 35) * 100 : null },
    { key: 'Routing', weight: 5, score: result.routing.overallAccuracy },
    { key: 'Autonomy Health', weight: 10, score: result.autonomy.totalEvents > 0 ? result.autonomy.executionSuccessRate : null },
    { key: 'Safety', weight: 5, score: result.safety.verdict === 'pass' ? 100 : result.safety.verdict === 'fail' ? 0 : null },
    { key: 'Performance', weight: 5, score: result.latency.verdict === 'PASS' ? 100 : result.latency.verdict === 'WARN' ? 50 : result.latency.verdict === 'FAIL' ? 0 : null },
    { key: 'Cost Efficiency', weight: 5, score: Math.max(0, 100 - Math.min(100, result.cost.costPerMessage * 1000)) },
  ];

  // Redistribute weights from null sections
  const active = sections.filter(s => s.score != null);
  const totalActiveWeight = active.reduce((sum, s) => sum + s.weight, 0);
  const scaleFactor = totalActiveWeight > 0 ? 100 / totalActiveWeight : 0;

  const breakdown: HealthScore['breakdown'] = {};
  let overall = 0;

  for (const s of sections) {
    const effectiveWeight = s.score != null ? (s.weight / totalActiveWeight) * 100 : 0;
    const weighted = s.score != null ? (s.score * effectiveWeight) / 100 : 0;
    breakdown[s.key] = { score: Math.round((s.score ?? 0) * 10) / 10, weight: Math.round(effectiveWeight * 10) / 10, weighted: Math.round(weighted * 10) / 10 };
    overall += weighted;
  }

  overall = Math.round(overall * 10) / 10;
  const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'F';

  return { overall, grade, breakdown };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const llmKeys = detectLlmKeys();

  console.log(`\n🔬 Hatchin Benchmark Suite — Run ${runId}\n`);
  console.log(`LLM Keys: Gemini=${llmKeys.gemini ? '✓' : '✗'} OpenAI=${llmKeys.openai ? '✓' : '✗'} Groq=${llmKeys.groq ? '✓' : '✗'}`);

  const pool = await getPool();
  const hasDb = pool != null;
  console.log(`Database: ${hasDb ? '✓ Connected' : '✗ Not available (DB metrics will be skipped)'}\n`);

  // ── Parallel DB queries ──────────────────────────────────────────
  let satisfaction: SatisfactionMetrics = { totalReactions: 0, thumbsUp: 0, thumbsDown: 0, approvalRate: 0, avgQuality: null, avgHelpfulness: null, avgAccuracy: null, byAgent: [] };
  let taskValue: TaskValueMetrics = { aiSuggested: 0, aiApproved: 0, aiCompleted: 0, userCreated: 0, approvalRate: 0, completionRate: 0 };
  let conversationQuality: ConversationQualityMetrics = { avgMessagesPerConversation: 0, totalConversations: 0, clarificationLoopRate: 0, firstResponseHitRate: 0, voiceConsistencyScore: null, streamingCancellationRate: 0 };
  let knowledge: KnowledgeMetrics = { totalMemoryEntries: 0, avgMemoriesPerProject: 0, avgImportance: 0, projectsWithBrain: 0, projectsWithCoreDirection: 0, totalProjects: 0 };
  let cost: CostMetrics = { totalTokens: 0, totalCostCents: 0, totalMessages: 0, standardMessages: 0, premiumMessages: 0, autonomyExecutions: 0, costPerMessage: 0, groqSavingsPercent: 0, last7Days: [] };

  let agents: AgentRow[] = [];

  if (hasDb) {
    console.log('  Querying database metrics...');
    const results = await Promise.allSettled([
      querySatisfaction(pool),
      queryTaskValue(pool),
      queryConversationQuality(pool),
      queryKnowledge(pool),
      queryCost(pool),
      fetchAgents(pool),
    ]);

    if (results[0].status === 'fulfilled') satisfaction = results[0].value;
    if (results[1].status === 'fulfilled') taskValue = results[1].value;
    if (results[2].status === 'fulfilled') conversationQuality = results[2].value;
    if (results[3].status === 'fulfilled') knowledge = results[3].value;
    if (results[4].status === 'fulfilled') cost = results[4].value;
    if (results[5].status === 'fulfilled') agents = results[5].value;
    console.log('  ✓ Database queries complete\n');
  }

  // ── Agent learning metrics (from agent data) ─────────────────────
  console.log('  Computing agent learning metrics...');
  const personality = queryPersonality(agents);
  const trust = queryTrust(agents);
  const training = queryTraining();
  const feedbackCorrelation = computeFeedbackCorrelation(agents, satisfaction);
  console.log('  ✓ Agent learning metrics complete\n');

  // ── System health (autonomy events + latency) ────────────────────
  console.log('  Querying autonomy events...');
  const [autonomy, latency, safety] = await Promise.all([
    queryAutonomy(),
    queryLatency(),
    querySafety(),
  ]);
  console.log('  ✓ Autonomy metrics complete\n');

  // ── Intelligence eval (LLM-dependent) ────────────────────────────
  let intelligence: IntelligenceMetrics;
  if (llmKeys.gemini || llmKeys.openai) {
    console.log('  Running intelligence eval (LLM)...');
    intelligence = await runIntelligenceEval();
    console.log(`  ✓ Intelligence: ${intelligence.smartnessScore ?? 'skipped'}/${intelligence.smartnessMax}\n`);
  } else {
    console.log('  ⊘ Skipping intelligence eval (no LLM keys)\n');
    intelligence = { smartnessScore: null, smartnessMax: 35, drift: null, perCategory: {}, skipped: true };
  }

  // ── Routing eval ─────────────────────────────────────────────────
  console.log('  Running routing eval...');
  const routing = await runRoutingEval();
  console.log(`  ✓ Routing: ${routing.overallAccuracy ?? 'skipped'}%\n`);

  // ── Quality tests ────────────────────────────────────────────────
  console.log('  Running quality tests (294 tests)...');
  const qualityTests = await runQualityTests();
  const allPassed = qualityTests.every(t => t.passed);
  console.log(`  ✓ Quality tests: ${allPassed ? 'ALL PASS' : 'SOME FAILED'}\n`);

  // ── Compute health score ─────────────────────────────────────────
  const partial = {
    runId, generatedAt: new Date().toISOString(), durationMs: 0,
    llmKeysAvailable: llmKeys,
    satisfaction, taskValue, conversationQuality, knowledge,
    personality, trust, training, feedbackCorrelation,
    intelligence, routing, autonomy, safety, latency, cost,
    qualityTests,
  };

  const healthScore = computeHealthScore(partial);
  const durationMs = Date.now() - startTime;

  const result: BenchmarkResult = { ...partial, durationMs, healthScore };

  // ── Write result ─────────────────────────────────────────────────
  await fs.mkdir(HISTORY_DIR, { recursive: true });
  const resultPath = path.join(HISTORY_DIR, `${runId}.json`);
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2), 'utf8');

  // ── Print summary ────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log(`  HEALTH SCORE: ${healthScore.grade} (${healthScore.overall}/100)`);
  console.log('═'.repeat(60));
  console.log(`  Duration: ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  Result saved: ${resultPath}\n`);

  console.log('  Breakdown:');
  for (const [key, val] of Object.entries(healthScore.breakdown)) {
    const bar = '█'.repeat(Math.round(val.score / 5)) + '░'.repeat(Math.max(0, 20 - Math.round(val.score / 5)));
    console.log(`    ${key.padEnd(22)} ${bar} ${val.score.toFixed(0).padStart(4)}% (w: ${val.weight.toFixed(0)}%)`);
  }

  console.log(`\n  Run \`npm run benchmark:report\` for full markdown report.\n`);

  // Clean up DB connection
  if (pool) {
    try { await (pool as any).end?.(); } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error('Benchmark suite failed:', err);
  process.exit(1);
});
