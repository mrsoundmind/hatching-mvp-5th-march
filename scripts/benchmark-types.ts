/**
 * Unified Benchmark Result Schema
 *
 * Used by benchmark-suite.ts (writer) and benchmark-report.ts (reader).
 * Covers 14 metric sections across 3 categories:
 *   A. User Value (satisfaction, tasks, conversation quality, knowledge)
 *   B. Agent Learning (personality, trust, training, feedback-quality correlation)
 *   C. System Health (intelligence, routing, autonomy, safety, latency, cost)
 */

import type { DriftCheckResult } from '../server/eval/drift/driftMonitor.js';

// ── Part A: User Value ──────────────────────────────────────────────

export interface AgentSatisfaction {
  agentId: string;
  agentName: string;
  role: string;
  thumbsUp: number;
  thumbsDown: number;
  approvalRate: number;
  avgQuality: number | null;
  avgHelpfulness: number | null;
  avgAccuracy: number | null;
}

export interface SatisfactionMetrics {
  totalReactions: number;
  thumbsUp: number;
  thumbsDown: number;
  approvalRate: number;
  avgQuality: number | null;
  avgHelpfulness: number | null;
  avgAccuracy: number | null;
  byAgent: AgentSatisfaction[];
}

export interface TaskValueMetrics {
  aiSuggested: number;
  aiApproved: number;
  aiCompleted: number;
  userCreated: number;
  approvalRate: number;
  completionRate: number;
}

export interface ConversationQualityMetrics {
  avgMessagesPerConversation: number;
  totalConversations: number;
  clarificationLoopRate: number;
  firstResponseHitRate: number;
  voiceConsistencyScore: number | null;
  streamingCancellationRate: number;
}

export interface KnowledgeMetrics {
  totalMemoryEntries: number;
  avgMemoriesPerProject: number;
  avgImportance: number;
  projectsWithBrain: number;
  projectsWithCoreDirection: number;
  totalProjects: number;
}

// ── Part B: Agent Learning ──────────────────────────────────────────

export interface PersonalityMetrics {
  totalAgents: number;
  agentsWithAdaptation: number;
  avgAdaptationConfidence: number;
  avgInteractionCount: number;
  coldStartAgents: number;   // interactionCount < 3
  matureAgents: number;      // interactionCount > 20
  avgTraitDelta: number;     // mean absolute deviation from base
}

export interface TrustMetrics {
  totalAgents: number;
  avgTrustScore: number;
  distribution: {
    high: number;     // >= 0.7
    medium: number;   // 0.3-0.7
    low: number;      // < 0.3
    noData: number;
  };
  fullyMature: number; // 10+ tasks
  avgTasksCompleted: number;
  avgTasksFailed: number;
}

export interface TrainingMetrics {
  totalFeedback: number;
  goodCount: number;
  badCount: number;
  successRate: number;
  learningPatterns: number;
  avgPatternConfidence: number;
  available: boolean; // false if server not running
}

export interface FeedbackQualityCorrelation {
  highAdaptationSatisfaction: number | null;  // avg approval for agents w/ confidence > 0.6
  lowAdaptationSatisfaction: number | null;   // avg approval for agents w/ confidence <= 0.6
  highTrustSatisfaction: number | null;       // avg approval for agents w/ trust > 0.5
  lowTrustSatisfaction: number | null;        // avg approval for agents w/ trust <= 0.5
  correlationSignal: 'positive' | 'negative' | 'neutral' | 'insufficient_data';
}

// ── Part C: System Health ───────────────────────────────────────────

export interface IntelligenceMetrics {
  smartnessScore: number | null;
  smartnessMax: number;
  drift: DriftCheckResult | null;
  perCategory: Record<string, number>;
  skipped: boolean;
}

export interface RoutingMetrics {
  hatchAccuracy: number | null;
  modeAccuracy: number | null;
  overallAccuracy: number | null;
  totalCases: number;
  avgRealTrafficConfidence: number | null;
  specialistRoutePercent: number | null;
  verdict: 'pass' | 'warn' | 'fail' | 'skipped';
}

export interface AutonomyMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  executionSuccessRate: number;
  handoffCount: number;
  peerReviewCount: number;
  peerReviewRevisionRate: number;
  safetyTriggerCount: number;
  avgConfidence: number;
  avgRiskScore: number;
}

export interface SafetyMetrics {
  baselineCasesRun: number;
  baselinePassed: boolean;
  interventionRate: number;
  falsePositiveProxy: number; // low-risk messages that got blocked
  verdict: 'pass' | 'fail' | 'skipped';
}

export interface LatencyMetrics {
  overall: { count: number; p50: number; p95: number };
  byClass: Record<string, { count: number; p50: number; p95: number }>;
  verdict: 'PASS' | 'WARN' | 'FAIL' | 'NO_DATA';
}

export interface CostMetrics {
  totalTokens: number;
  totalCostCents: number;
  totalMessages: number;
  standardMessages: number;
  premiumMessages: number;
  autonomyExecutions: number;
  costPerMessage: number;
  groqSavingsPercent: number;
  last7Days: Array<{
    date: string;
    messages: number;
    tokens: number;
    costCents: number;
  }>;
}

export interface QualityTestResult {
  name: string;
  passed: boolean;
  testCount: number;
  error?: string;
}

// ── Composite ───────────────────────────────────────────────────────

export interface HealthScore {
  overall: number;        // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: Record<string, { score: number; weight: number; weighted: number }>;
}

export interface BenchmarkResult {
  runId: string;
  generatedAt: string;
  durationMs: number;
  llmKeysAvailable: { gemini: boolean; openai: boolean; groq: boolean };

  // Part A: User Value
  satisfaction: SatisfactionMetrics;
  taskValue: TaskValueMetrics;
  conversationQuality: ConversationQualityMetrics;
  knowledge: KnowledgeMetrics;

  // Part B: Agent Learning
  personality: PersonalityMetrics;
  trust: TrustMetrics;
  training: TrainingMetrics;
  feedbackCorrelation: FeedbackQualityCorrelation;

  // Part C: System Health
  intelligence: IntelligenceMetrics;
  routing: RoutingMetrics;
  autonomy: AutonomyMetrics;
  safety: SafetyMetrics;
  latency: LatencyMetrics;
  cost: CostMetrics;

  // Gates
  qualityTests: QualityTestResult[];

  // Composite
  healthScore: HealthScore;
}
