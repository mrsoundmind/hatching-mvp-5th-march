/**
 * SAFE-04: Progressive Trust Scoring
 *
 * Calculates a trust score (0.0-1.0) for an agent based on their
 * autonomous task execution history. Higher trust unlocks higher
 * autonomy thresholds (fewer approval gates).
 */

export interface TrustMeta {
  tasksCompleted: number;
  tasksFailed: number;
  trustScore: number;
  lastUpdated: string;
}

export interface TrustInput {
  tasksCompleted: number;
  tasksFailed: number;
  currentTrustScore?: number;
}

/**
 * Calculate trust score from agent's execution history.
 *
 * Formula: success_rate * maturity_factor
 * - success_rate = completed / (completed + failed), default 0.5 if no history
 * - maturity_factor = min(1, total_tasks / MATURITY_THRESHOLD)
 *   Agents need at least MATURITY_THRESHOLD tasks before reaching full trust potential
 *
 * Score is bounded [0.0, 1.0] and grows gradually — an agent with 3 completions
 * and 0 failures gets ~0.3 (not 1.0) because maturity is low.
 */
const MATURITY_THRESHOLD = 10;

export function calculateTrustScore(input: TrustInput): number {
  const { tasksCompleted, tasksFailed } = input;
  const total = tasksCompleted + tasksFailed;

  if (total === 0) {
    return 0.0;
  }

  const successRate = tasksCompleted / total;
  const maturityFactor = Math.min(1.0, total / MATURITY_THRESHOLD);
  const raw = successRate * maturityFactor;

  // Bound to [0.0, 1.0]
  return Math.max(0.0, Math.min(1.0, raw));
}

/**
 * Update trust meta after a task execution.
 * Returns updated TrustMeta to persist in agent.personality.
 */
export function updateTrustMeta(
  current: Partial<TrustMeta> | undefined,
  success: boolean,
): TrustMeta {
  const prev: TrustMeta = {
    tasksCompleted: current?.tasksCompleted ?? 0,
    tasksFailed: current?.tasksFailed ?? 0,
    trustScore: current?.trustScore ?? 0,
    lastUpdated: current?.lastUpdated ?? new Date().toISOString(),
  };

  if (success) {
    prev.tasksCompleted++;
  } else {
    prev.tasksFailed++;
  }

  prev.trustScore = calculateTrustScore({
    tasksCompleted: prev.tasksCompleted,
    tasksFailed: prev.tasksFailed,
  });
  prev.lastUpdated = new Date().toISOString();

  return prev;
}
